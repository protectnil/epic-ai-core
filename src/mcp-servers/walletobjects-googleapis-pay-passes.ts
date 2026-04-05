/**
 * Google Wallet Objects (Pay Passes) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/walletobjects.googleapis.com/pay-passes/v1/openapi.json
// Base URL: https://walletobjects.googleapis.com
// Auth: OAuth2 Bearer token with scope https://www.googleapis.com/auth/wallet_object.issuer
// Docs: https://developers.google.com/pay/passes
// Category: finance
// Tools: list_loyalty_classes, insert_loyalty_class, get_loyalty_class,
//        list_loyalty_objects, insert_loyalty_object, get_loyalty_object,
//        list_gift_card_classes, insert_gift_card_class, get_gift_card_class,
//        list_gift_card_objects, insert_gift_card_object, get_gift_card_object,
//        list_offer_classes, insert_offer_class, get_offer_class,
//        list_offer_objects, insert_offer_object, get_offer_object,
//        list_event_ticket_classes, insert_jwt

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WalletObjectsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class WalletobjectsGooglapisPayspassesMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: WalletObjectsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://walletobjects.googleapis.com';
  }

  static catalog() {
    return {
      name: 'walletobjects-googleapis-pay-passes',
      displayName: 'Google Wallet Objects (Pay Passes)',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'google', 'wallet', 'pay', 'passes', 'loyalty', 'gift-card', 'offer',
        'event-ticket', 'flight', 'transit', 'boarding-pass', 'coupon', 'fintech',
        'digital-wallet', 'issuer', 'jwt',
      ],
      toolNames: [
        'list_loyalty_classes', 'insert_loyalty_class', 'get_loyalty_class',
        'list_loyalty_objects', 'insert_loyalty_object', 'get_loyalty_object',
        'list_gift_card_classes', 'insert_gift_card_class', 'get_gift_card_class',
        'list_gift_card_objects', 'insert_gift_card_object', 'get_gift_card_object',
        'list_offer_classes', 'insert_offer_class', 'get_offer_class',
        'list_offer_objects', 'insert_offer_object', 'get_offer_object',
        'list_event_ticket_classes', 'insert_jwt',
      ],
      description: 'Google Wallet Objects API: create and manage digital passes for loyalty programs, gift cards, offers, and event tickets issued through Google Wallet.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_loyalty_classes',
        description: 'List all loyalty card classes for a given issuer, used to define the template for loyalty passes in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            issuerId: {
              type: 'string',
              description: 'The issuer ID authorized to list loyalty classes (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return; returns all if omitted',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous list call to retrieve the next page',
            },
          },
          required: ['issuerId'],
        },
      },
      {
        name: 'insert_loyalty_class',
        description: 'Create a new loyalty card class defining the template and branding for a loyalty pass program in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique class ID in format issuerId.classId (required)',
            },
            issuerName: {
              type: 'string',
              description: 'Name of the issuer to display on the pass (required)',
            },
            programName: {
              type: 'string',
              description: 'Name of the loyalty program displayed on the pass (required)',
            },
            reviewStatus: {
              type: 'string',
              description: 'Review status: UNDER_REVIEW, APPROVED, REJECTED, DRAFT (default: UNDER_REVIEW)',
            },
            body: {
              type: 'object',
              description: 'Full loyalty class object with additional fields per the Google Wallet API spec',
            },
          },
          required: ['id', 'issuerName', 'programName'],
        },
      },
      {
        name: 'get_loyalty_class',
        description: 'Retrieve a specific loyalty card class by its resource ID from Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: {
              type: 'string',
              description: 'Unique identifier of the loyalty class in format issuerId.classId (required)',
            },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_loyalty_objects',
        description: 'List all loyalty card object instances for a given class, representing individual passes issued to users',
        inputSchema: {
          type: 'object',
          properties: {
            classId: {
              type: 'string',
              description: 'Class ID to list objects for (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous list call',
            },
          },
          required: ['classId'],
        },
      },
      {
        name: 'insert_loyalty_object',
        description: 'Create a new loyalty card object (individual pass instance) for a user in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique object ID in format issuerId.objectId (required)',
            },
            classId: {
              type: 'string',
              description: 'Class ID this object belongs to (required)',
            },
            state: {
              type: 'string',
              description: 'Pass state: ACTIVE, INACTIVE, COMPLETED, EXPIRED (default: ACTIVE)',
            },
            body: {
              type: 'object',
              description: 'Full loyalty object with additional fields including account ID, points balance, etc.',
            },
          },
          required: ['id', 'classId'],
        },
      },
      {
        name: 'get_loyalty_object',
        description: 'Retrieve a specific loyalty card object by its resource ID from Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: {
              type: 'string',
              description: 'Unique identifier of the loyalty object in format issuerId.objectId (required)',
            },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_gift_card_classes',
        description: 'List all gift card classes for a given issuer in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            issuerId: {
              type: 'string',
              description: 'The issuer ID to list gift card classes for (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous list call',
            },
          },
          required: ['issuerId'],
        },
      },
      {
        name: 'insert_gift_card_class',
        description: 'Create a new gift card class defining the template for gift card passes in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique class ID in format issuerId.classId (required)',
            },
            issuerName: {
              type: 'string',
              description: 'Name of the issuer to display on the gift card pass (required)',
            },
            reviewStatus: {
              type: 'string',
              description: 'Review status: UNDER_REVIEW, APPROVED, REJECTED, DRAFT',
            },
            body: {
              type: 'object',
              description: 'Full gift card class object with additional fields per the Google Wallet API spec',
            },
          },
          required: ['id', 'issuerName'],
        },
      },
      {
        name: 'get_gift_card_class',
        description: 'Retrieve a specific gift card class by its resource ID from Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: {
              type: 'string',
              description: 'Unique identifier of the gift card class in format issuerId.classId (required)',
            },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_gift_card_objects',
        description: 'List all gift card object instances for a given class, representing individual gift cards in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            classId: {
              type: 'string',
              description: 'Class ID to list gift card objects for (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous list call',
            },
          },
          required: ['classId'],
        },
      },
      {
        name: 'insert_gift_card_object',
        description: 'Create a new gift card object (individual pass instance) for a user in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique object ID in format issuerId.objectId (required)',
            },
            classId: {
              type: 'string',
              description: 'Class ID this gift card object belongs to (required)',
            },
            state: {
              type: 'string',
              description: 'Pass state: ACTIVE, INACTIVE, COMPLETED, EXPIRED',
            },
            cardNumber: {
              type: 'string',
              description: 'Gift card number displayed on the pass',
            },
            body: {
              type: 'object',
              description: 'Full gift card object with additional fields including balance, pin, etc.',
            },
          },
          required: ['id', 'classId'],
        },
      },
      {
        name: 'get_gift_card_object',
        description: 'Retrieve a specific gift card object by its resource ID from Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: {
              type: 'string',
              description: 'Unique identifier of the gift card object in format issuerId.objectId (required)',
            },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_offer_classes',
        description: 'List all offer classes for a given issuer in Google Wallet, used to define coupon and promotion templates',
        inputSchema: {
          type: 'object',
          properties: {
            issuerId: {
              type: 'string',
              description: 'The issuer ID to list offer classes for (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous list call',
            },
          },
          required: ['issuerId'],
        },
      },
      {
        name: 'insert_offer_class',
        description: 'Create a new offer class defining the template for a coupon or promotion pass in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique class ID in format issuerId.classId (required)',
            },
            issuerName: {
              type: 'string',
              description: 'Name of the issuer to display on the offer pass (required)',
            },
            title: {
              type: 'string',
              description: 'Title of the offer displayed on the pass (required)',
            },
            reviewStatus: {
              type: 'string',
              description: 'Review status: UNDER_REVIEW, APPROVED, REJECTED, DRAFT',
            },
            body: {
              type: 'object',
              description: 'Full offer class object with additional fields per the Google Wallet API spec',
            },
          },
          required: ['id', 'issuerName', 'title'],
        },
      },
      {
        name: 'get_offer_class',
        description: 'Retrieve a specific offer class by its resource ID from Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: {
              type: 'string',
              description: 'Unique identifier of the offer class in format issuerId.classId (required)',
            },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_offer_objects',
        description: 'List all offer object instances for a given offer class, representing individual coupons issued to users in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            classId: {
              type: 'string',
              description: 'Class ID to list offer objects for (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous list call',
            },
          },
          required: ['classId'],
        },
      },
      {
        name: 'insert_offer_object',
        description: 'Create a new offer object (individual coupon pass instance) for a user in Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique object ID in format issuerId.objectId (required)',
            },
            classId: {
              type: 'string',
              description: 'Class ID this offer object belongs to (required)',
            },
            state: {
              type: 'string',
              description: 'Pass state: ACTIVE, INACTIVE, COMPLETED, EXPIRED',
            },
            body: {
              type: 'object',
              description: 'Full offer object with additional fields',
            },
          },
          required: ['id', 'classId'],
        },
      },
      {
        name: 'get_offer_object',
        description: 'Retrieve a specific offer object by its resource ID from Google Wallet',
        inputSchema: {
          type: 'object',
          properties: {
            resourceId: {
              type: 'string',
              description: 'Unique identifier of the offer object in format issuerId.objectId (required)',
            },
          },
          required: ['resourceId'],
        },
      },
      {
        name: 'list_event_ticket_classes',
        description: 'List all event ticket classes for a given issuer in Google Wallet, used to define templates for event admission passes',
        inputSchema: {
          type: 'object',
          properties: {
            issuerId: {
              type: 'string',
              description: 'The issuer ID to list event ticket classes for (required)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
            token: {
              type: 'string',
              description: 'Pagination token from a previous list call',
            },
          },
          required: ['issuerId'],
        },
      },
      {
        name: 'insert_jwt',
        description: 'Insert a Google Wallet JWT to create or update multiple pass objects in a single request, returning a save URL for the user',
        inputSchema: {
          type: 'object',
          properties: {
            jwt: {
              type: 'string',
              description: 'Signed JWT containing origins, payload with classes and objects to create or update (required)',
            },
          },
          required: ['jwt'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_loyalty_classes':
          return await this.listClasses('loyaltyClass', args);
        case 'insert_loyalty_class':
          return await this.insertClass('loyaltyClass', args, ['id', 'issuerName', 'programName']);
        case 'get_loyalty_class':
          return await this.getResource('loyaltyClass', args);
        case 'list_loyalty_objects':
          return await this.listObjects('loyaltyObject', args);
        case 'insert_loyalty_object':
          return await this.insertObject('loyaltyObject', args);
        case 'get_loyalty_object':
          return await this.getResource('loyaltyObject', args);
        case 'list_gift_card_classes':
          return await this.listClasses('giftCardClass', args);
        case 'insert_gift_card_class':
          return await this.insertClass('giftCardClass', args, ['id', 'issuerName']);
        case 'get_gift_card_class':
          return await this.getResource('giftCardClass', args);
        case 'list_gift_card_objects':
          return await this.listObjects('giftCardObject', args);
        case 'insert_gift_card_object':
          return await this.insertObject('giftCardObject', args);
        case 'get_gift_card_object':
          return await this.getResource('giftCardObject', args);
        case 'list_offer_classes':
          return await this.listClasses('offerClass', args);
        case 'insert_offer_class':
          return await this.insertClass('offerClass', args, ['id', 'issuerName', 'title']);
        case 'get_offer_class':
          return await this.getResource('offerClass', args);
        case 'list_offer_objects':
          return await this.listObjects('offerObject', args);
        case 'insert_offer_object':
          return await this.insertObject('offerObject', args);
        case 'get_offer_object':
          return await this.getResource('offerObject', args);
        case 'list_event_ticket_classes':
          return await this.listClasses('eventTicketClass', args);
        case 'insert_jwt':
          return await this.insertJwt(args);
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

  private requestHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.requestHeaders() });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Google Wallet API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    return response.json();
  }

  private resourcePath(resource: string): string {
    // Convert camelCase resource name to URL path segment
    // e.g. loyaltyClass -> loyaltyClass, giftCardClass -> giftCardClass
    return resource;
  }

  private async listClasses(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const issuerId = args.issuerId as string;
    if (!issuerId) {
      return { content: [{ type: 'text', text: 'issuerId is required' }], isError: true };
    }
    const params = new URLSearchParams({ issuerId });
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.token) params.set('token', args.token as string);
    const data = await this.fetchJson(`${this.baseUrl}/walletobjects/v1/${this.resourcePath(resource)}?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async insertClass(resource: string, args: Record<string, unknown>, requiredFields: string[]): Promise<ToolResult> {
    for (const field of requiredFields) {
      if (!args[field]) {
        return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
      }
    }
    const body: Record<string, unknown> = { ...(args.body as Record<string, unknown> ?? {}) };
    for (const field of requiredFields) {
      body[field] = args[field];
    }
    if (args.reviewStatus) body['reviewStatus'] = args.reviewStatus;
    const data = await this.fetchJson(`${this.baseUrl}/walletobjects/v1/${this.resourcePath(resource)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getResource(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const resourceId = args.resourceId as string;
    if (!resourceId) {
      return { content: [{ type: 'text', text: 'resourceId is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/walletobjects/v1/${this.resourcePath(resource)}/${encodeURIComponent(resourceId)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listObjects(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const classId = args.classId as string;
    if (!classId) {
      return { content: [{ type: 'text', text: 'classId is required' }], isError: true };
    }
    const params = new URLSearchParams({ classId });
    if (args.maxResults) params.set('maxResults', String(args.maxResults));
    if (args.token) params.set('token', args.token as string);
    const data = await this.fetchJson(`${this.baseUrl}/walletobjects/v1/${this.resourcePath(resource)}?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async insertObject(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const classId = args.classId as string;
    if (!id || !classId) {
      return { content: [{ type: 'text', text: 'id and classId are required' }], isError: true };
    }
    const body: Record<string, unknown> = { ...(args.body as Record<string, unknown> ?? {}), id, classId };
    if (args.state) body['state'] = args.state;
    if (args.cardNumber) body['cardNumber'] = args.cardNumber;
    const data = await this.fetchJson(`${this.baseUrl}/walletobjects/v1/${this.resourcePath(resource)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async insertJwt(args: Record<string, unknown>): Promise<ToolResult> {
    const jwt = args.jwt as string;
    if (!jwt) {
      return { content: [{ type: 'text', text: 'jwt is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/walletobjects/v1/jwt`, {
      method: 'POST',
      body: JSON.stringify({ jwt }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

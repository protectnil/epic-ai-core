/**
 * ColorMe Shop (shop-pro.jp) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. ColorMe Shop (カラーミーショップ) has not published
//   an official MCP server.
//
// Base URL: https://api.shop-pro.jp
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   Scopes: write_application_charge, read_shop_script_tags, write_shop_script_tags,
//           read_inline_script_tags, write_inline_script_tags
// Docs: https://developer.shop-pro.jp/docs/colorme-api
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShopProJpConfig {
  accessToken: string;
  baseUrl?: string;
}

export class ShopProJpMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ShopProJpConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.shop-pro.jp';
  }

  static catalog() {
    return {
      name: 'shop-pro-jp',
      displayName: 'ColorMe Shop (shop-pro.jp)',
      version: '1.0.0',
      category: 'ecommerce' as const,
      keywords: [
        'colorme', 'shop-pro', 'japan', 'ecommerce', 'script tag', 'application charge',
        'inline script', 'billing', 'usage charge', 'appstore', 'uninstall',
      ],
      toolNames: [
        'create_application_charge',
        'uninstall_app',
        'create_usage_charge',
        'list_shop_script_tags',
        'create_shop_script_tag',
        'get_shop_script_tag',
        'update_shop_script_tag',
        'delete_shop_script_tag',
        'list_inline_script_tags',
        'create_inline_script_tag',
        'get_inline_script_tag',
        'update_inline_script_tag',
        'delete_inline_script_tag',
      ],
      description:
        'Manage ColorMe Shop (カラーミーショップ) app store integrations: in-app billing charges, ' +
        'usage-based charges, shop script tags, and inline script tags via the ColorMe App Store API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Billing / Charges ─────────────────────────────────────────────────
      {
        name: 'create_application_charge',
        description:
          'Create an in-app (one-time) billing charge for a shop owner. ' +
          'Requires write_application_charge scope.',
        inputSchema: {
          type: 'object',
          properties: {
            application_charge_source_id: {
              type: 'string',
              description: 'The app-internal charge source ID registered in the developer portal (e.g. "5S1DAG")',
            },
          },
          required: ['application_charge_source_id'],
        },
      },
      {
        name: 'uninstall_app',
        description:
          'Uninstall the app from the shop associated with the current OAuth access token. ' +
          'Returns uninstall details including account_id and charge info. ' +
          'Note: uninstall hooks are NOT fired when using this API endpoint.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_usage_charge',
        description:
          'Create a usage-based (metered) billing charge against an existing recurring charge contract. ' +
          'Requires write_application_charge scope.',
        inputSchema: {
          type: 'object',
          properties: {
            recurring_application_charge_id: {
              type: 'string',
              description: 'The recurring charge contract ID issued at app install (e.g. "A3FT4N")',
            },
            price: {
              type: 'number',
              description: 'Amount to charge in points (tax-exclusive)',
            },
            description: {
              type: 'string',
              description: 'Description of the usage being charged',
            },
          },
          required: ['recurring_application_charge_id', 'price'],
        },
      },
      // ── Shop Script Tags ──────────────────────────────────────────────────
      {
        name: 'list_shop_script_tags',
        description:
          'List all script tags registered for the shop page. ' +
          'Requires read_shop_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_shop_script_tag',
        description:
          'Register a new HTTPS script tag to be injected into the shop page. ' +
          'The script URL must be served with appropriate CORS headers. ' +
          'Requires write_shop_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {
            src: {
              type: 'string',
              description: 'HTTPS URL of the script to inject (required)',
            },
            integrity: {
              type: 'string',
              description: 'Subresource Integrity (SRI) hash for the script',
            },
            event: {
              type: 'string',
              description: 'Page event to load the script on (e.g. "onload")',
            },
          },
          required: ['src'],
        },
      },
      {
        name: 'get_shop_script_tag',
        description: 'Get details of a specific shop script tag by its ID. Requires read_shop_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {
            script_tag_id: {
              type: 'string',
              description: 'The script tag ID to retrieve',
            },
          },
          required: ['script_tag_id'],
        },
      },
      {
        name: 'update_shop_script_tag',
        description:
          'Update an existing shop script tag. When the script content changes you must provide ' +
          'an updated integrity hash. Requires write_shop_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {
            script_tag_id: {
              type: 'string',
              description: 'The script tag ID to update',
            },
            src: {
              type: 'string',
              description: 'New HTTPS URL of the script',
            },
            integrity: {
              type: 'string',
              description: 'Updated SRI hash matching the new script content',
            },
            event: {
              type: 'string',
              description: 'Updated page event',
            },
          },
          required: ['script_tag_id'],
        },
      },
      {
        name: 'delete_shop_script_tag',
        description: 'Delete a shop script tag by ID. Requires write_shop_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {
            script_tag_id: {
              type: 'string',
              description: 'The script tag ID to delete',
            },
          },
          required: ['script_tag_id'],
        },
      },
      // ── Inline Script Tags ────────────────────────────────────────────────
      {
        name: 'list_inline_script_tags',
        description:
          'List all inline script tags registered for the shop. ' +
          'Requires read_inline_script_tags scope. ' +
          'Note: This endpoint is unavailable to new developers.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_inline_script_tag',
        description:
          'Register a new inline script to be injected into the shop page. ' +
          'Requires write_inline_script_tags scope. ' +
          'Note: This endpoint is unavailable to new developers.',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'The JavaScript source code to inject inline (required)',
            },
            event: {
              type: 'string',
              description: 'Page event to execute the script on',
            },
          },
          required: ['script'],
        },
      },
      {
        name: 'get_inline_script_tag',
        description:
          'Get details of a specific inline script tag by ID. ' +
          'Requires read_inline_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {
            inline_script_tag_id: {
              type: 'string',
              description: 'The inline script tag ID to retrieve',
            },
          },
          required: ['inline_script_tag_id'],
        },
      },
      {
        name: 'update_inline_script_tag',
        description:
          'Update an existing inline script tag by ID. ' +
          'Requires write_inline_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {
            inline_script_tag_id: {
              type: 'string',
              description: 'The inline script tag ID to update',
            },
            script: {
              type: 'string',
              description: 'Updated JavaScript source code',
            },
            event: {
              type: 'string',
              description: 'Updated page event',
            },
          },
          required: ['inline_script_tag_id'],
        },
      },
      {
        name: 'delete_inline_script_tag',
        description:
          'Delete an inline script tag by ID. Requires write_inline_script_tags scope.',
        inputSchema: {
          type: 'object',
          properties: {
            inline_script_tag_id: {
              type: 'string',
              description: 'The inline script tag ID to delete',
            },
          },
          required: ['inline_script_tag_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_application_charge':   return await this.createApplicationCharge(args);
        case 'uninstall_app':               return await this.uninstallApp();
        case 'create_usage_charge':         return await this.createUsageCharge(args);
        case 'list_shop_script_tags':       return await this.listShopScriptTags();
        case 'create_shop_script_tag':      return await this.createShopScriptTag(args);
        case 'get_shop_script_tag':         return await this.getShopScriptTag(args);
        case 'update_shop_script_tag':      return await this.updateShopScriptTag(args);
        case 'delete_shop_script_tag':      return await this.deleteShopScriptTag(args);
        case 'list_inline_script_tags':     return await this.listInlineScriptTags();
        case 'create_inline_script_tag':    return await this.createInlineScriptTag(args);
        case 'get_inline_script_tag':       return await this.getInlineScriptTag(args);
        case 'update_inline_script_tag':    return await this.updateInlineScriptTag(args);
        case 'delete_inline_script_tag':    return await this.deleteInlineScriptTag(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.buildHeaders(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(url, init);

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{
          type: 'text',
          text: `ColorMe API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}`,
        }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (response.status === 204 || !contentType.includes('application/json')) {
      return { content: [{ type: 'text', text: `Success (HTTP ${response.status})` }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `ColorMe returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Billing ────────────────────────────────────────────────────────────────

  private async createApplicationCharge(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/appstore/v1/application_charges.json', {
      application_charge: {
        application_charge_source_id: args.application_charge_source_id,
      },
    });
  }

  private async uninstallApp(): Promise<ToolResult> {
    return this.request('DELETE', '/appstore/v1/installation.json');
  }

  private async createUsageCharge(args: Record<string, unknown>): Promise<ToolResult> {
    const { recurring_application_charge_id, price, description } = args;
    const body: Record<string, unknown> = { price };
    if (description) body.description = description;
    return this.request(
      'POST',
      `/appstore/v1/recurring_application_charges/${recurring_application_charge_id}/usage_charges.json`,
      { usage_charge: body },
    );
  }

  // ── Shop Script Tags ───────────────────────────────────────────────────────

  private async listShopScriptTags(): Promise<ToolResult> {
    return this.request('GET', '/appstore/v1/script_tags.json');
  }

  private async createShopScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    const { src, integrity, event } = args;
    const tag: Record<string, unknown> = { src };
    if (integrity) tag.integrity = integrity;
    if (event) tag.event = event;
    return this.request('POST', '/appstore/v1/script_tags.json', { script_tag: tag });
  }

  private async getShopScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/appstore/v1/script_tags/${args.script_tag_id}.json`);
  }

  private async updateShopScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    const { script_tag_id, ...rest } = args;
    const tag: Record<string, unknown> = {};
    if (rest.src) tag.src = rest.src;
    if (rest.integrity) tag.integrity = rest.integrity;
    if (rest.event) tag.event = rest.event;
    return this.request('PUT', `/appstore/v1/script_tags/${script_tag_id}.json`, { script_tag: tag });
  }

  private async deleteShopScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/appstore/v1/script_tags/${args.script_tag_id}.json`);
  }

  // ── Inline Script Tags ─────────────────────────────────────────────────────

  private async listInlineScriptTags(): Promise<ToolResult> {
    return this.request('GET', '/v1/inline_script_tags.json');
  }

  private async createInlineScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    const { script, event } = args;
    const tag: Record<string, unknown> = { script };
    if (event) tag.event = event;
    return this.request('POST', '/v1/inline_script_tags.json', { inline_script_tag: tag });
  }

  private async getInlineScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/v1/inline_script_tags/${args.inline_script_tag_id}.json`);
  }

  private async updateInlineScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    const { inline_script_tag_id, ...rest } = args;
    const tag: Record<string, unknown> = {};
    if (rest.script) tag.script = rest.script;
    if (rest.event) tag.event = rest.event;
    return this.request('PUT', `/v1/inline_script_tags/${inline_script_tag_id}.json`, { inline_script_tag: tag });
  }

  private async deleteInlineScriptTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/v1/inline_script_tags/${args.inline_script_tag_id}.json`);
  }
}

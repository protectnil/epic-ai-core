/**
 * BrainBI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official BrainBI MCP server was found on GitHub or the vendor site.
//
// Base URL: https://brainbi.net (no versioned basePath in spec)
// Auth: Bearer token obtained via POST /api/login with email + password
// Docs: https://www.postman.com/collections/1148203-6a9d2dc5-3f7e-47f5-ae7d-782740625908-SzKZtGPb
// Spec: https://api.apis.guru/v2/specs/brainbi.net/1.0.0/openapi.json
// Rate limits: Not publicly documented
// Note: Session-based auth — call login first to get bearer token, logout when done.
//
// Category: analytics (ecommerce analytics — pricing, products, customers, orders, SEO, rules)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrainBIConfig {
  bearerToken?: string;
  email?: string;
  password?: string;
  baseUrl?: string;
}

export class BrainBIMCPServer extends MCPAdapterBase {
  private bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: BrainBIConfig) {
    super();
    this.bearerToken = config.bearerToken ?? '';
    this.baseUrl = config.baseUrl ?? 'https://brainbi.net';
  }

  static catalog() {
    return {
      name: 'brainbi',
      displayName: 'BrainBI',
      version: '1.0.0',
      category: 'analytics',
      keywords: [
        'brainbi', 'analytics', 'ecommerce', 'pricing', 'repricing', 'pricing rules',
        'products', 'customers', 'orders', 'order lines', 'seo', 'ranking',
        'competitor', 'intelligence', 'retail analytics', 'woocommerce',
      ],
      toolNames: [
        'login', 'logout', 'register', 'register_woocommerce',
        'get_customers', 'get_orders', 'delete_order',
        'get_products', 'delete_product',
        'scrape_product_pricing',
        'get_pricing_rules', 'get_rule_data', 'get_rule_data_latest',
        'get_seo_rankings_latest',
      ],
      description: 'BrainBI ecommerce analytics platform: authenticate, manage customers, orders, and products, analyze competitor pricing via scraping, configure pricing rules, and track SEO keyword rankings.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Auth ───────────────────────────────────────────────────────────────
      {
        name: 'login',
        description: 'Authenticate with the BrainBI platform using email and password to obtain a Bearer token for subsequent API calls',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'BrainBI account email address' },
            password: { type: 'string', description: 'BrainBI account password' },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'logout',
        description: 'Invalidate the current Bearer token and lock the account — always call after finishing API operations',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'BrainBI account email (required to identify the session to close)' },
          },
          required: ['email'],
        },
      },
      {
        name: 'register',
        description: 'Register a new BrainBI account with email and password',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address for the new account' },
            password: { type: 'string', description: 'Password for the new account' },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'register_woocommerce',
        description: 'Register a new BrainBI account and simultaneously create a WooCommerce store connection',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address for the new account' },
            password: { type: 'string', description: 'Password for the new account' },
            storeUrl: { type: 'string', description: 'WooCommerce store URL (e.g. "https://myshop.com")' },
            consumerKey: { type: 'string', description: 'WooCommerce REST API consumer key' },
            consumerSecret: { type: 'string', description: 'WooCommerce REST API consumer secret' },
          },
          required: ['email', 'password', 'storeUrl'],
        },
      },
      // ── Customers ──────────────────────────────────────────────────────────
      {
        name: 'get_customers',
        description: 'List all customers currently saved in the BrainBI account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Orders ─────────────────────────────────────────────────────────────
      {
        name: 'get_orders',
        description: 'List all orders currently saved in the BrainBI account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'delete_order',
        description: 'Delete a specific order from the BrainBI account by order ID',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Order ID to delete (e.g. "1137")' },
          },
          required: ['orderId'],
        },
      },
      // ── Products ───────────────────────────────────────────────────────────
      {
        name: 'get_products',
        description: 'List all products currently saved in the BrainBI account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a specific product from the BrainBI account by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product ID to delete (e.g. "1137")' },
          },
          required: ['productId'],
        },
      },
      {
        name: 'scrape_product_pricing',
        description: '[BETA] Scrape competitor product copy and pricing data from a product URL — uses AI to extract pricing information',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the product page to scrape (e.g. "https://www.apple.com/de/shop/buy-homepod/homepod-mini")',
            },
          },
          required: ['url'],
        },
      },
      // ── Pricing Rules ──────────────────────────────────────────────────────
      {
        name: 'get_pricing_rules',
        description: 'List all configured pricing/repricing rules in the BrainBI account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_rule_data',
        description: 'Get the full data history for a specific pricing rule by rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            ruleId: { type: 'string', description: 'Pricing rule ID (e.g. "1")' },
          },
          required: ['ruleId'],
        },
      },
      {
        name: 'get_rule_data_latest',
        description: 'Get the most recent data snapshot for a specific pricing rule by rule ID',
        inputSchema: {
          type: 'object',
          properties: {
            ruleId: { type: 'string', description: 'Pricing rule ID (e.g. "1")' },
          },
          required: ['ruleId'],
        },
      },
      // ── SEO ────────────────────────────────────────────────────────────────
      {
        name: 'get_seo_rankings_latest',
        description: 'Get the latest SEO keyword rankings tracked in the BrainBI account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'login':                    return this.login(args);
        case 'logout':                   return this.logout(args);
        case 'register':                 return this.register(args);
        case 'register_woocommerce':     return this.registerWoocommerce(args);
        case 'get_customers':            return this.getCustomers();
        case 'get_orders':               return this.getOrders();
        case 'delete_order':             return this.deleteOrder(args);
        case 'get_products':             return this.getProducts();
        case 'delete_product':           return this.deleteProduct(args);
        case 'scrape_product_pricing':   return this.scrapeProductPricing(args);
        case 'get_pricing_rules':        return this.getPricingRules();
        case 'get_rule_data':            return this.getRuleData(args);
        case 'get_rule_data_latest':     return this.getRuleDataLatest(args);
        case 'get_seo_rankings_latest':  return this.getSeoRankingsLatest();
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, params: Record<string, string> = {}, body?: Record<string, unknown>): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const fetchOpts: RequestInit = {
      method: 'POST',
      headers: this.authHeaders,
    };
    if (body) fetchOpts.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, fetchOpts);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    if (!text) return { content: [{ type: 'text', text: 'Success' }], isError: false };
    try {
      const data = JSON.parse(text);
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    } catch {
      return { content: [{ type: 'text', text: text }], isError: false };
    }
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    if (!text) return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
    try {
      const data = JSON.parse(text);
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    } catch {
      return { content: [{ type: 'text', text: text }], isError: false };
    }
  }

  // ── Auth methods ───────────────────────────────────────────────────────────

  private async login(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password) {
      return { content: [{ type: 'text', text: 'email and password are required' }], isError: true };
    }
    const params = { email: args.email as string, password: args.password as string };
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/login?${new URLSearchParams(params).toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Login failed: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as Record<string, unknown>;
    // Store the token if returned in a common field
    const token = (data.token ?? data.access_token ?? data.bearer_token ?? data.data) as string | undefined;
    if (token && typeof token === 'string') {
      this.bearerToken = token;
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async logout(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) {
      return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    }
    const result = await this.apiPost('/api/logout', { email: args.email as string });
    this.bearerToken = '';
    return result;
  }

  private async register(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password) {
      return { content: [{ type: 'text', text: 'email and password are required' }], isError: true };
    }
    return this.apiPost('/api/register', { email: args.email as string, password: args.password as string });
  }

  private async registerWoocommerce(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.password || !args.storeUrl) {
      return { content: [{ type: 'text', text: 'email, password, and storeUrl are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      email: args.email,
      password: args.password,
      storeUrl: args.storeUrl,
    };
    if (args.consumerKey) body.consumerKey = args.consumerKey;
    if (args.consumerSecret) body.consumerSecret = args.consumerSecret;
    return this.apiPost('/api/register_woocommerce', {}, body);
  }

  // ── Customer methods ───────────────────────────────────────────────────────

  private async getCustomers(): Promise<ToolResult> {
    return this.apiGet('/api/customers');
  }

  // ── Order methods ──────────────────────────────────────────────────────────

  private async getOrders(): Promise<ToolResult> {
    return this.apiGet('/api/orders');
  }

  private async deleteOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    return this.apiDelete(`/api/orders/${encodeURIComponent(args.orderId as string)}`);
  }

  // ── Product methods ────────────────────────────────────────────────────────

  private async getProducts(): Promise<ToolResult> {
    return this.apiGet('/api/products');
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.productId) return { content: [{ type: 'text', text: 'productId is required' }], isError: true };
    return this.apiDelete(`/api/products/${encodeURIComponent(args.productId as string)}`);
  }

  private async scrapeProductPricing(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    return this.apiGet('/api/analyze/pricing', { url: args.url as string });
  }

  // ── Pricing Rule methods ───────────────────────────────────────────────────

  private async getPricingRules(): Promise<ToolResult> {
    return this.apiGet('/api/rule');
  }

  private async getRuleData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ruleId) return { content: [{ type: 'text', text: 'ruleId is required' }], isError: true };
    return this.apiGet(`/api/rule/ruleData/${encodeURIComponent(args.ruleId as string)}`);
  }

  private async getRuleDataLatest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ruleId) return { content: [{ type: 'text', text: 'ruleId is required' }], isError: true };
    return this.apiGet(`/api/rule/ruleData/${encodeURIComponent(args.ruleId as string)}/latest`);
  }

  // ── SEO methods ────────────────────────────────────────────────────────────

  private async getSeoRankingsLatest(): Promise<ToolResult> {
    return this.apiGet('/api/seo/ranking/latest');
  }
}

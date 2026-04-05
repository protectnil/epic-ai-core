/**
 * Google Travel Partner (Hotel Center) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Google Travel Partner / Hotel Center MCP server was found on GitHub or Google's MCP directory.
// Google's per-service remote MCP servers cover Cloud, BigQuery, Compute, etc., but not Travel Partner API.
//
// Base URL: https://travelpartner.googleapis.com/v3
// Auth: OAuth2 Bearer token (service account or user OAuth2 access token with travelpartner scope)
// Docs: https://developers.google.com/hotels/hotel-ads/api-reference/rest
// Rate limits: Standard Google API quota; subject to per-project limits in Cloud Console

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleTravelPartnerConfig {
  accessToken: string;
  baseUrl?: string;
}

export class GoogleMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: GoogleTravelPartnerConfig) {
    super();
    this.token = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://travelpartner.googleapis.com/v3').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'google',
      displayName: 'Google Travel Partner (Hotel Center)',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'google', 'travel', 'hotel', 'hotel center', 'travel partner',
        'hospitality', 'booking', 'price accuracy', 'price coverage',
        'reconciliation', 'brand', 'account link', 'property performance',
        'participation', 'live on google', 'hotel ads', 'icon', 'listing',
      ],
      toolNames: [
        'list_hotels', 'summarize_hotels', 'list_brands', 'create_brand', 'update_brand',
        'list_account_links', 'create_account_link', 'delete_account_link',
        'list_icons', 'create_icon',
        'list_price_accuracy_views', 'summarize_price_accuracy',
        'list_price_coverage_views', 'get_latest_price_coverage',
        'list_reconciliation_reports', 'get_reconciliation_report',
        'create_reconciliation_report', 'validate_reconciliation_report',
        'query_property_performance', 'query_participation_report',
        'set_hotels_live_on_google', 'verify_listings',
      ],
      description: 'Google Hotel Center (Travel Partner API): manage hotel listings, brands, price accuracy, price coverage, reconciliation reports, and property performance for hotel ad campaigns.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_hotels',
        description: 'List hotel views for a Hotel Center account with optional filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            filter: { type: 'string', description: 'Filter expression to narrow hotel results by status or property ID' },
            pageSize: { type: 'number', description: 'Maximum number of hotels to return (default: 50)' },
            pageToken: { type: 'string', description: 'Pagination token from a previous list_hotels response' },
          },
          required: ['account'],
        },
      },
      {
        name: 'summarize_hotels',
        description: 'Return summarized information about all hotels in a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'list_brands',
        description: 'List all brands associated with a Hotel Center partner account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'create_brand',
        description: 'Create a new brand for a Hotel Center partner account with optional brand ID',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            brandId: { type: 'string', description: 'Desired brand ID; Google assigns one if omitted' },
            brand: { type: 'object', description: 'Brand resource object with displayNames, icon, etc.' },
          },
          required: ['account'],
        },
      },
      {
        name: 'update_brand',
        description: 'Update an existing brand by resource name with optional field mask',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full brand resource name, e.g. accounts/12345678/brands/my-brand' },
            brand: { type: 'object', description: 'Brand resource fields to update' },
            updateMask: { type: 'string', description: 'Comma-separated fields to update, e.g. displayNames,icon' },
            allowMissing: { type: 'boolean', description: 'If true, create the brand if it does not exist (default: false)' },
          },
          required: ['name', 'brand'],
        },
      },
      {
        name: 'list_account_links',
        description: 'List all account links between a Hotel Center account and Google Ads accounts',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'create_account_link',
        description: 'Create a new account link between a Hotel Center account and a Google Ads account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            accountLink: { type: 'object', description: 'AccountLink resource with googleAdsCustomerId and other fields' },
          },
          required: ['account', 'accountLink'],
        },
      },
      {
        name: 'delete_account_link',
        description: 'Delete an account link by its full resource name',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full account link resource name, e.g. accounts/12345678/accountLinks/9876' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_icons',
        description: 'List all icons (brand logos) associated with a Hotel Center partner account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'create_icon',
        description: 'Upload a new icon for a Hotel Center account and start its review process',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            icon: { type: 'object', description: 'Icon resource with imageData (base64) and mimeType fields' },
          },
          required: ['account', 'icon'],
        },
      },
      {
        name: 'list_price_accuracy_views',
        description: 'List available price accuracy views for a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'summarize_price_accuracy',
        description: 'Return a summary of price accuracy across all hotels in a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'list_price_coverage_views',
        description: 'Return the full price coverage history for a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'get_latest_price_coverage',
        description: 'Return the latest price coverage view in full detail for a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
          },
          required: ['account'],
        },
      },
      {
        name: 'list_reconciliation_reports',
        description: 'List reconciliation report names for a Hotel Center account with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            startDate: { type: 'string', description: 'Start date filter in YYYY-MM-DD format (inclusive)' },
            endDate: { type: 'string', description: 'End date filter in YYYY-MM-DD format (inclusive)' },
          },
          required: ['account'],
        },
      },
      {
        name: 'get_reconciliation_report',
        description: 'Retrieve a specific reconciliation report by resource name with optional detail flags',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full reconciliation report resource name, e.g. accounts/12345678/reconciliationReports/2026-01' },
            includeMatchedPrices: { type: 'boolean', description: 'Include matched price data in the report (default: false)' },
            includeNonScoring: { type: 'boolean', description: 'Include non-scoring entries in the report (default: false)' },
            includePixels: { type: 'boolean', description: 'Include pixel data in the report (default: false)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_reconciliation_report',
        description: 'Create a new reconciliation report and upload it to Google Hotel Center',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            report: { type: 'object', description: 'ReconciliationReport resource body with booking and price data' },
          },
          required: ['account', 'report'],
        },
      },
      {
        name: 'validate_reconciliation_report',
        description: 'Validate a reconciliation report before submitting it to Google Hotel Center',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            report: { type: 'object', description: 'ReconciliationReport resource body to validate' },
          },
          required: ['account', 'report'],
        },
      },
      {
        name: 'query_property_performance',
        description: 'Query property performance report with filters and aggregations for a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            aggregateBy: { type: 'string', description: 'Comma-separated fields to aggregate by, e.g. propertyId,date' },
            filter: { type: 'string', description: "Filter expression, e.g. date = '2026-01-01' AND partnerPropertyId = 'hotel123'" },
            pageSize: { type: 'number', description: 'Maximum number of rows to return (default: 100)' },
            pageToken: { type: 'string', description: 'Pagination token from a previous query response' },
          },
          required: ['account'],
        },
      },
      {
        name: 'query_participation_report',
        description: 'Query participation report with filters and aggregations for a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            aggregateBy: { type: 'string', description: 'Comma-separated fields to aggregate by, e.g. propertyId,date' },
            filter: { type: 'string', description: "Filter expression, e.g. date = '2026-01' AND partnerPropertyId = 'hotel123'" },
            pageSize: { type: 'number', description: 'Maximum number of rows to return (default: 100)' },
            pageToken: { type: 'string', description: 'Pagination token from a previous query response' },
          },
          required: ['account'],
        },
      },
      {
        name: 'set_hotels_live_on_google',
        description: 'Bulk update the Live on Google status for multiple hotel properties in a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            body: { type: 'object', description: 'SetLiveOnGoogleRequest body with hotelIds array and liveOnGoogle boolean' },
          },
          required: ['account', 'body'],
        },
      },
      {
        name: 'verify_listings',
        description: 'Verify hotel listings and return data issues and serving eligibilities for a Hotel Center account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Hotel Center account resource name, e.g. accounts/12345678' },
            body: { type: 'object', description: 'VerifyListingsRequest body (can be empty object {})' },
          },
          required: ['account'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_hotels': return this.listHotels(args);
        case 'summarize_hotels': return this.summarizeHotels(args);
        case 'list_brands': return this.listBrands(args);
        case 'create_brand': return this.createBrand(args);
        case 'update_brand': return this.updateBrand(args);
        case 'list_account_links': return this.listAccountLinks(args);
        case 'create_account_link': return this.createAccountLink(args);
        case 'delete_account_link': return this.deleteAccountLink(args);
        case 'list_icons': return this.listIcons(args);
        case 'create_icon': return this.createIcon(args);
        case 'list_price_accuracy_views': return this.listPriceAccuracyViews(args);
        case 'summarize_price_accuracy': return this.summarizePriceAccuracy(args);
        case 'list_price_coverage_views': return this.listPriceCoverageViews(args);
        case 'get_latest_price_coverage': return this.getLatestPriceCoverage(args);
        case 'list_reconciliation_reports': return this.listReconciliationReports(args);
        case 'get_reconciliation_report': return this.getReconciliationReport(args);
        case 'create_reconciliation_report': return this.createReconciliationReport(args);
        case 'validate_reconciliation_report': return this.validateReconciliationReport(args);
        case 'query_property_performance': return this.queryPropertyPerformance(args);
        case 'query_participation_report': return this.queryParticipationReport(args);
        case 'set_hotels_live_on_google': return this.setHotelsLiveOnGoogle(args);
        case 'verify_listings': return this.verifyListings(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async doGet(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]' : text }],
      isError: false,
    };
  }

  private async doPost(url: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]' : text }],
      isError: false,
    };
  }

  private async doPatch(url: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]' : text }],
      isError: false,
    };
  }

  private async doDelete(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = response.status === 204 ? '{"status":"deleted"}' : JSON.stringify(await response.json(), null, 2);
    return { content: [{ type: 'text', text }], isError: false };
  }

  private normalizeAccount(account: string): string {
    return account.startsWith('accounts/') ? account : `accounts/${account}`;
  }

  private qs(params: Record<string, string | number | boolean | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? '?' + s : '';
  }

  private async listHotels(args: Record<string, unknown>): Promise<ToolResult> {
    const parent = this.normalizeAccount(args.account as string);
    return this.doGet(`${this.baseUrl}/${parent}/hotelViews${this.qs({ filter: args.filter as string, pageSize: args.pageSize as number, pageToken: args.pageToken as string })}`);
  }

  private async summarizeHotels(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/hotelViews:summarize`);
  }

  private async listBrands(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/brands`);
  }

  private async createBrand(args: Record<string, unknown>): Promise<ToolResult> {
    const parent = this.normalizeAccount(args.account as string);
    return this.doPost(`${this.baseUrl}/${parent}/brands${this.qs({ brandId: args.brandId as string })}`, args.brand ?? {});
  }

  private async updateBrand(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPatch(
      `${this.baseUrl}/${args.name as string}${this.qs({ updateMask: args.updateMask as string, allowMissing: args.allowMissing as boolean })}`,
      args.brand ?? {},
    );
  }

  private async listAccountLinks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/accountLinks`);
  }

  private async createAccountLink(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/accountLinks`, args.accountLink ?? {});
  }

  private async deleteAccountLink(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/${args.name as string}`);
  }

  private async listIcons(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/icons`);
  }

  private async createIcon(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/icons`, args.icon ?? {});
  }

  private async listPriceAccuracyViews(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/priceAccuracyViews`);
  }

  private async summarizePriceAccuracy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/priceAccuracyViews:summarize`);
  }

  private async listPriceCoverageViews(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/priceCoverageViews`);
  }

  private async getLatestPriceCoverage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/priceCoverageViews:latest`);
  }

  private async listReconciliationReports(args: Record<string, unknown>): Promise<ToolResult> {
    const parent = this.normalizeAccount(args.account as string);
    return this.doGet(`${this.baseUrl}/${parent}/reconciliationReports${this.qs({ startDate: args.startDate as string, endDate: args.endDate as string })}`);
  }

  private async getReconciliationReport(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/${args.name as string}${this.qs({ includeMatchedPrices: args.includeMatchedPrices as boolean, includeNonScoring: args.includeNonScoring as boolean, includePixels: args.includePixels as boolean })}`);
  }

  private async createReconciliationReport(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/reconciliationReports`, args.report ?? {});
  }

  private async validateReconciliationReport(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/reconciliationReports:validate`, args.report ?? {});
  }

  private async queryPropertyPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    const name = this.normalizeAccount(args.account as string);
    return this.doGet(`${this.baseUrl}/${name}/propertyPerformanceReportViews:query${this.qs({ aggregateBy: args.aggregateBy as string, filter: args.filter as string, pageSize: args.pageSize as number, pageToken: args.pageToken as string })}`);
  }

  private async queryParticipationReport(args: Record<string, unknown>): Promise<ToolResult> {
    const name = this.normalizeAccount(args.account as string);
    return this.doGet(`${this.baseUrl}/${name}/participationReportViews:query${this.qs({ aggregateBy: args.aggregateBy as string, filter: args.filter as string, pageSize: args.pageSize as number, pageToken: args.pageToken as string })}`);
  }

  private async setHotelsLiveOnGoogle(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/hotels:setLiveOnGoogle`, args.body ?? {});
  }

  private async verifyListings(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/${this.normalizeAccount(args.account as string)}/listings:verify`, args.body ?? {});
  }
}

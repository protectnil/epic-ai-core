/**
 * Viator MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Viator MCP server was found on GitHub.
//
// Base URL: https://viatorapi.viator.com/service
// Auth: API key — pass in exp-api-key header (sandbox) or API-key header (production)
// Docs: https://docs.viator.com/partner-api/merchant/technical/
// Rate limits: Not publicly documented; sandbox limits apply in test environment

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ViatorConfig {
  apiKey: string;
  environment?: 'production' | 'sandbox';
}

export class ViatorMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly isSandbox: boolean;

  constructor(config: ViatorConfig) {
    super();
    this.isSandbox = (config.environment ?? 'production') === 'sandbox';
    this.baseUrl = this.isSandbox
      ? 'https://viatorapi.sandbox.viator.com/service'
      : 'https://viatorapi.viator.com/service';
    this.apiKey = config.apiKey;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Products ─────────────────────────────────────────────────────────────
      {
        name: 'get_product',
        description: 'Get full details for a specific Viator tour or experience by product code',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Viator product code (e.g. "5010SYDNEY")' },
          },
          required: ['code'],
        },
      },
      {
        name: 'get_product_photos',
        description: 'Get photos for a Viator product',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Viator product code' },
            top_x: { type: 'number', description: 'Number of photos to return (default: 10)' },
          },
          required: ['code'],
        },
      },
      {
        name: 'get_product_reviews',
        description: 'Get traveler reviews for a Viator product',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Viator product code' },
            top_x: { type: 'number', description: 'Number of reviews to return (default: 10)' },
            sort_by: { type: 'string', description: 'Sort order: TOP_TRAVELLER_REVIEWS or DATE' },
          },
          required: ['code'],
        },
      },
      // ── Search ───────────────────────────────────────────────────────────────
      {
        name: 'search_products_freetext',
        description: 'Search Viator products by free-text query',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Search text (free-text query)' },
            destination_id: { type: 'number', description: 'Optional destination ID to scope search' },
            top_x: { type: 'number', description: 'Number of results to return (default: 10)' },
            sort_order: { type: 'string', description: 'Sort: PRICE_FROM_LOW_TO_HIGH, PRICE_FROM_HIGH_TO_LOW, TOP_SELLERS, REVIEW_AVG_RATING_A' },
          },
          required: ['text'],
        },
      },
      {
        name: 'search_products',
        description: 'Search Viator products by destination with optional category and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            destination_id: { type: 'number', description: 'Destination ID to search in' },
            start_date: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
            price_from: { type: 'number', description: 'Minimum price filter' },
            price_to: { type: 'number', description: 'Maximum price filter' },
            duration_id: { type: 'number', description: 'Duration filter ID' },
            category_id: { type: 'number', description: 'Category filter ID' },
            top_x: { type: 'number', description: 'Number of results (default: 10)' },
            sort_order: { type: 'string', description: 'Sort order' },
          },
          required: ['destination_id'],
        },
      },
      {
        name: 'search_products_by_codes',
        description: 'Get product details for a list of specific product codes',
        inputSchema: {
          type: 'object',
          properties: {
            codes: { type: 'array', items: { type: 'string' }, description: 'List of product codes' },
          },
          required: ['codes'],
        },
      },
      // ── Availability ─────────────────────────────────────────────────────────
      {
        name: 'check_availability',
        description: 'Check availability for a product on specific dates',
        inputSchema: {
          type: 'object',
          properties: {
            product_code: { type: 'string', description: 'Product code' },
            currency_code: { type: 'string', description: 'ISO 4217 currency code (e.g. USD)' },
            start_date: { type: 'string', description: 'Check from date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'Check to date (YYYY-MM-DD)' },
          },
          required: ['product_code', 'currency_code'],
        },
      },
      {
        name: 'get_availability_dates',
        description: 'Get all available dates for a product',
        inputSchema: {
          type: 'object',
          properties: {
            product_code: { type: 'string', description: 'Product code' },
          },
          required: ['product_code'],
        },
      },
      {
        name: 'get_tour_grades_availability',
        description: 'Get available tour grades and pricing for a product on a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            product_code: { type: 'string', description: 'Product code' },
            booking_date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
            currency_code: { type: 'string', description: 'Currency code' },
          },
          required: ['product_code', 'booking_date', 'currency_code'],
        },
      },
      // ── Bookings ─────────────────────────────────────────────────────────────
      {
        name: 'calculate_price',
        description: 'Calculate the price for a booking before committing',
        inputSchema: {
          type: 'object',
          properties: {
            product_code: { type: 'string', description: 'Product code' },
            tour_grade_code: { type: 'string', description: 'Tour grade code' },
            booking_date: { type: 'string', description: 'Booking date (YYYY-MM-DD)' },
            currency_code: { type: 'string', description: 'Currency code' },
            travellers: {
              type: 'array',
              description: 'Traveller band quantities: [{ bandId, quantity }]',
              items: { type: 'object' },
            },
          },
          required: ['product_code', 'tour_grade_code', 'booking_date', 'currency_code', 'travellers'],
        },
      },
      {
        name: 'create_booking',
        description: 'Create a booking for a Viator tour or experience',
        inputSchema: {
          type: 'object',
          properties: {
            product_code: { type: 'string', description: 'Product code' },
            tour_grade_code: { type: 'string', description: 'Tour grade code' },
            booking_date: { type: 'string', description: 'Booking date (YYYY-MM-DD)' },
            currency_code: { type: 'string', description: 'Currency code' },
            distribution_ref: { type: 'string', description: 'Your internal booking reference' },
            booking_questions: { type: 'array', items: { type: 'object' }, description: 'Answers to booking questions' },
            travellers: { type: 'array', items: { type: 'object' }, description: 'Traveller details' },
          },
          required: ['product_code', 'tour_grade_code', 'booking_date', 'currency_code', 'distribution_ref'],
        },
      },
      {
        name: 'get_booking_status',
        description: 'Get the current status of bookings by item or booking references',
        inputSchema: {
          type: 'object',
          properties: {
            item_ids: { type: 'array', items: { type: 'number' }, description: 'Viator item IDs' },
            booking_refs: { type: 'array', items: { type: 'string' }, description: 'Your distribution references' },
          },
        },
      },
      {
        name: 'cancel_booking',
        description: 'Cancel an existing booking',
        inputSchema: {
          type: 'object',
          properties: {
            booking_reference: { type: 'string', description: 'Booking reference to cancel' },
            item_id: { type: 'number', description: 'Viator item ID to cancel (alternative to booking_reference)' },
            reason_code: { type: 'number', description: 'Cancellation reason code' },
          },
          required: ['booking_reference', 'reason_code'],
        },
      },
      {
        name: 'get_cancel_quote',
        description: 'Get cancellation penalty details for a booking before cancelling',
        inputSchema: {
          type: 'object',
          properties: {
            booking_reference: { type: 'string', description: 'Booking reference' },
          },
          required: ['booking_reference'],
        },
      },
      // ── Taxonomy ─────────────────────────────────────────────────────────────
      {
        name: 'list_destinations',
        description: 'Get all available destinations in the Viator system',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_categories',
        description: 'Get all available activity categories',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_cancellation_reasons',
        description: 'Get the list of valid cancellation reason codes',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_product': return await this.getProduct(args);
        case 'get_product_photos': return await this.getProductPhotos(args);
        case 'get_product_reviews': return await this.getProductReviews(args);
        case 'search_products_freetext': return await this.searchProductsFreetext(args);
        case 'search_products': return await this.searchProducts(args);
        case 'search_products_by_codes': return await this.searchProductsByCodes(args);
        case 'check_availability': return await this.checkAvailability(args);
        case 'get_availability_dates': return await this.getAvailabilityDates(args);
        case 'get_tour_grades_availability': return await this.getTourGradesAvailability(args);
        case 'calculate_price': return await this.calculatePrice(args);
        case 'create_booking': return await this.createBooking(args);
        case 'get_booking_status': return await this.getBookingStatus(args);
        case 'cancel_booking': return await this.cancelBooking(args);
        case 'get_cancel_quote': return await this.getCancelQuote(args);
        case 'list_destinations': return await this.listDestinations();
        case 'list_categories': return await this.listCategories();
        case 'get_cancellation_reasons': return await this.getCancellationReasons();
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

  private get headers(): Record<string, string> {
    return {
      'exp-api-key': this.apiKey,
      'Accept-Language': 'en-US',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }


  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ code: String(args.code) });
    return this.fetchJSON(`${this.baseUrl}/product?${params}`);
  }

  private async getProductPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ code: String(args.code) });
    if (args.top_x) params.set('topX', String(args.top_x));
    return this.fetchJSON(`${this.baseUrl}/product/photos?${params}`);
  }

  private async getProductReviews(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ code: String(args.code) });
    if (args.top_x) params.set('topX', String(args.top_x));
    if (args.sort_by) params.set('sortBy', String(args.sort_by));
    return this.fetchJSON(`${this.baseUrl}/product/reviews?${params}`);
  }

  private async searchProductsFreetext(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { text: args.text };
    if (args.destination_id) body.destId = args.destination_id;
    if (args.top_x) body.topX = args.top_x;
    if (args.sort_order) body.sortOrder = args.sort_order;
    return this.fetchJSON(`${this.baseUrl}/search/freetext`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async searchProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { destId: args.destination_id };
    if (args.start_date) body.startDate = args.start_date;
    if (args.end_date) body.endDate = args.end_date;
    if (args.price_from) body.priceFrom = args.price_from;
    if (args.price_to) body.priceTo = args.price_to;
    if (args.category_id) body.catId = args.category_id;
    if (args.top_x) body.topX = args.top_x;
    if (args.sort_order) body.sortOrder = args.sort_order;
    return this.fetchJSON(`${this.baseUrl}/search/products`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async searchProductsByCodes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/search/products/codes`, {
      method: 'POST',
      body: JSON.stringify({ productCodes: args.codes }),
    });
  }

  private async checkAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      productCode: args.product_code,
      currencyCode: args.currency_code,
    };
    if (args.start_date) body.startDate = args.start_date;
    if (args.end_date) body.endDate = args.end_date;
    return this.fetchJSON(`${this.baseUrl}/booking/availability`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async getAvailabilityDates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ productCode: String(args.product_code) });
    return this.fetchJSON(`${this.baseUrl}/booking/availability/dates?${params}`);
  }

  private async getTourGradesAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/booking/availability/tourgrades`, {
      method: 'POST',
      body: JSON.stringify({ productCode: args.product_code, bookingDate: args.booking_date, currencyCode: args.currency_code }),
    });
  }

  private async calculatePrice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/booking/calculateprice`, {
      method: 'POST',
      body: JSON.stringify({
        productCode: args.product_code,
        tourGradeCode: args.tour_grade_code,
        bookingDate: args.booking_date,
        currencyCode: args.currency_code,
        travellers: args.travellers,
      }),
    });
  }

  private async createBooking(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      productCode: args.product_code,
      tourGradeCode: args.tour_grade_code,
      bookingDate: args.booking_date,
      currencyCode: args.currency_code,
      distributionRef: args.distribution_ref,
    };
    if (args.travellers) body.travellers = args.travellers;
    if (args.booking_questions) body.bookingQuestionAnswers = args.booking_questions;
    return this.fetchJSON(`${this.baseUrl}/booking/book`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async getBookingStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.item_ids) body.itemIds = args.item_ids;
    if (args.booking_refs) body.distributionRefs = args.booking_refs;
    return this.fetchJSON(`${this.baseUrl}/booking/status`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async cancelBooking(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/bookings/${encodeURIComponent(String(args.booking_reference))}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode: args.reason_code }),
    });
  }

  private async getCancelQuote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/bookings/${encodeURIComponent(String(args.booking_reference))}/cancel-quote`);
  }

  private async listDestinations(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/taxonomy/destinations`);
  }

  private async listCategories(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/taxonomy/categories`);
  }

  private async getCancellationReasons(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/bookings/cancel-reasons`);
  }

  static catalog() {
    return {
      name: 'viator',
      displayName: 'Viator',
      version: '1.0.0',
      category: 'travel' as const,
      keywords: ['viator', 'tours', 'activities', 'experiences', 'travel', 'booking', 'tourism', 'excursions', 'sightseeing'],
      toolNames: [
        'get_product', 'get_product_photos', 'get_product_reviews',
        'search_products_freetext', 'search_products', 'search_products_by_codes',
        'check_availability', 'get_availability_dates', 'get_tour_grades_availability',
        'calculate_price', 'create_booking', 'get_booking_status', 'cancel_booking', 'get_cancel_quote',
        'list_destinations', 'list_categories', 'get_cancellation_reasons',
      ],
      description: 'Viator tours and experiences: search products, check availability, calculate prices, and manage bookings for travel activities worldwide.',
      author: 'protectnil' as const,
    };
  }
}

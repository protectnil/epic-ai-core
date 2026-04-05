/**
 * Wix MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/wix/wix-mcp — transport: streamable-HTTP (https://mcp.wix.com/mcp), auth: OAuth2 / API key
// Our adapter covers: 20 tools (sites, members, contacts, stores, orders, bookings, blog).
// Vendor MCP covers: 12 tools — 9 documentation/search tools + 3 API execution tools. Last updated: 2025, actively maintained.
//   Qualifies: official vendor repo, maintained, 12 tools, streamable-HTTP transport.
//
// Integration: use-both
//   MCP-only tools (9): SearchWixWDSDocumentation, SearchWixRESTDocumentation, SearchWixSDKDocumentation,
//     SearchBuildAppsDocumentation, SearchWixHeadlessDocumentation, WixBusinessFlowsDocumentation,
//     ReadFullDocsArticle, ReadFullDocsMethodSchema, SupportAndFeedback
//   MCP API tools (3): ListWixSites, CallWixSiteAPI, ManageWixSite (high-level, natural-language oriented)
//   REST-sourced tools (this adapter, 20): list_sites, get_site, list_members, get_member, update_member,
//     list_contacts, get_contact, create_contact, update_contact, delete_contact, query_products, get_product,
//     list_orders, get_order, update_order, list_bookings, get_booking, list_blog_posts, get_blog_post, list_site_pages
//   The MCP's API tools (ListWixSites, CallWixSiteAPI, ManageWixSite) are generic wrappers that call any Wix API;
//   our REST adapter provides explicit typed tools for specific endpoints with structured parameters.
//   Combined coverage: Use vendor MCP for documentation search and natural-language site management;
//   use this adapter for typed, structured access to specific Wix API resources.
//
// Base URL: https://www.wixapis.com
// Auth: Bearer token (OAuth2 access token or API key from Wix Business Manager)
// Docs: https://dev.wix.com/docs/rest
// Rate limits: Not publicly documented; HTTP 429 returned when limits exceeded

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WixConfig {
  accessToken: string;
  siteId?: string;
  accountId?: string;
  baseUrl?: string;
}

export class WixMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly siteId: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(config: WixConfig) {
    super();
    this.accessToken = config.accessToken;
    this.siteId = config.siteId || '';
    this.accountId = config.accountId || '';
    this.baseUrl = config.baseUrl || 'https://www.wixapis.com';
  }

  static catalog() {
    return {
      name: 'wix',
      displayName: 'Wix',
      version: '1.0.0',
      category: 'misc',
      keywords: ['wix', 'website', 'ecommerce', 'members', 'contacts', 'store', 'orders', 'products', 'bookings', 'blog', 'cms'],
      toolNames: [
        'list_sites', 'get_site',
        'list_members', 'get_member', 'update_member',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'query_products', 'get_product',
        'list_orders', 'get_order', 'update_order',
        'list_bookings', 'get_booking',
        'list_blog_posts', 'get_blog_post',
        'list_site_pages',
      ],
      description: 'Wix platform management: sites, member accounts, CRM contacts, ecommerce products and orders, bookings, and blog posts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sites',
        description: 'List all Wix sites associated with the account',
        inputSchema: {
          type: 'object',
          properties: {
            paging_limit: { type: 'number', description: 'Maximum sites to return (default: 50)' },
            paging_offset: { type: 'number', description: 'Number of sites to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Get details for a specific Wix site by site ID',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Wix site ID (defaults to configured siteId)' },
          },
        },
      },
      {
        name: 'list_members',
        description: 'List Wix site members with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: ACTIVE, PENDING, BLOCKED, OFFLINE (default: all)' },
            limit: { type: 'number', description: 'Maximum members to return (default: 50)' },
            offset: { type: 'number', description: 'Number of members to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_member',
        description: 'Get profile information for a specific Wix site member by member ID',
        inputSchema: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Wix member ID' },
          },
          required: ['member_id'],
        },
      },
      {
        name: 'update_member',
        description: 'Update profile fields for a Wix site member',
        inputSchema: {
          type: 'object',
          properties: {
            member_id: { type: 'string', description: 'Wix member ID to update' },
            nickname: { type: 'string', description: 'Display nickname for the member' },
            profile_photo_url: { type: 'string', description: 'URL for the member profile photo' },
          },
          required: ['member_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List Wix CRM contacts with optional search query and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search query to filter contacts by name, email, or phone' },
            limit: { type: 'number', description: 'Maximum contacts to return (default: 50)' },
            offset: { type: 'number', description: 'Number of contacts to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get CRM contact details for a specific Wix contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Wix contact ID' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new Wix CRM contact with name, email, and phone information',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Contact first name' },
            last_name: { type: 'string', description: 'Contact last name' },
            email: { type: 'string', description: 'Primary contact email address' },
            phone: { type: 'string', description: 'Primary contact phone number' },
          },
        },
      },
      {
        name: 'update_contact',
        description: 'Update fields for an existing Wix CRM contact',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Wix contact ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a Wix CRM contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Wix contact ID to delete' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'query_products',
        description: 'Query Wix Stores products with optional filters for name, price range, and inventory',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search term to filter products by name' },
            limit: { type: 'number', description: 'Maximum products to return (default: 50)' },
            offset: { type: 'number', description: 'Number of products to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get details and variants for a specific Wix Stores product by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: 'Wix product ID' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'list_orders',
        description: 'List Wix Stores orders with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by payment status: PAID, NOT_PAID, REFUNDED, PARTIALLY_REFUNDED (default: all)' },
            fulfillment_status: { type: 'string', description: 'Filter by fulfillment: FULFILLED, NOT_FULFILLED, CANCELED (default: all)' },
            limit: { type: 'number', description: 'Maximum orders to return (default: 50)' },
            offset: { type: 'number', description: 'Number of orders to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get full details for a specific Wix Stores order by order ID',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'Wix order ID' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'update_order',
        description: 'Update buyer note or custom fields on a Wix Stores order',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'Wix order ID to update' },
            buyer_note: { type: 'string', description: 'Updated buyer note' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_bookings',
        description: 'List Wix Bookings appointments with optional date range and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: { type: 'string', description: 'Start date filter in ISO 8601 format (e.g. 2026-01-01T00:00:00.000Z)' },
            to_date: { type: 'string', description: 'End date filter in ISO 8601 format' },
            status: { type: 'string', description: 'Filter by status: CONFIRMED, PENDING, CANCELED (default: all)' },
            limit: { type: 'number', description: 'Maximum bookings to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_booking',
        description: 'Get full details for a specific Wix Booking appointment by booking ID',
        inputSchema: {
          type: 'object',
          properties: {
            booking_id: { type: 'string', description: 'Wix booking ID' },
          },
          required: ['booking_id'],
        },
      },
      {
        name: 'list_blog_posts',
        description: 'List Wix Blog posts with optional status filter, search query, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: PUBLISHED, DRAFT, SCHEDULED (default: PUBLISHED)' },
            search: { type: 'string', description: 'Search term to filter blog posts by title' },
            limit: { type: 'number', description: 'Maximum posts to return (default: 50)' },
            offset: { type: 'number', description: 'Number of posts to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_blog_post',
        description: 'Get content and metadata for a specific Wix Blog post by post ID',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: { type: 'string', description: 'Wix blog post ID' },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'list_site_pages',
        description: 'List all pages on a Wix site including static and dynamic pages',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Wix site ID (defaults to configured siteId)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_sites': return this.listSites(args);
        case 'get_site': return this.getSite(args);
        case 'list_members': return this.listMembers(args);
        case 'get_member': return this.getMember(args);
        case 'update_member': return this.updateMember(args);
        case 'list_contacts': return this.listContacts(args);
        case 'get_contact': return this.getContact(args);
        case 'create_contact': return this.createContact(args);
        case 'update_contact': return this.updateContact(args);
        case 'delete_contact': return this.deleteContact(args);
        case 'query_products': return this.queryProducts(args);
        case 'get_product': return this.getProduct(args);
        case 'list_orders': return this.listOrders(args);
        case 'get_order': return this.getOrder(args);
        case 'update_order': return this.updateOrder(args);
        case 'list_bookings': return this.listBookings(args);
        case 'get_booking': return this.getBooking(args);
        case 'list_blog_posts': return this.listBlogPosts(args);
        case 'get_blog_post': return this.getBlogPost(args);
        case 'list_site_pages': return this.listSitePages(args);
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
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
    if (this.siteId) h['wix-site-id'] = this.siteId;
    if (this.accountId) h['wix-account-id'] = this.accountId;
    return h;
  }


  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ deleted: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }


  private async listSites(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      paging: {
        limit: (args.paging_limit as number) ?? 50,
        offset: (args.paging_offset as number) ?? 0,
      },
    };
    return this.post('/site-folders/v2/sites/search', body);
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    const siteId = (args.site_id as string) || this.siteId;
    if (!siteId) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/site-properties/v4/properties`, {
      headers: { ...this.headers, 'wix-site-id': siteId },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      paging: { limit: (args.limit as number) ?? 50, offset: (args.offset as number) ?? 0 },
    };
    if (args.status) body.filter = { status: { $eq: args.status } };
    return this.post('/members/v1/members/query', body);
  }

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.member_id) return { content: [{ type: 'text', text: 'member_id is required' }], isError: true };
    return this.get(`/members/v1/members/${encodeURIComponent(args.member_id as string)}`);
  }

  private async updateMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.member_id) return { content: [{ type: 'text', text: 'member_id is required' }], isError: true };
    const member: Record<string, unknown> = {};
    if (args.nickname) member.nickname = args.nickname;
    if (args.profile_photo_url) member.profilePhoto = { url: args.profile_photo_url };
    return this.patch(`/members/v1/members/${encodeURIComponent(args.member_id as string)}`, { member });
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      paging: { limit: (args.limit as number) ?? 50, offset: (args.offset as number) ?? 0 },
    };
    if (args.search) body.search = { expression: args.search };
    return this.post('/contacts/v4/contacts/query', body);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.get(`/contacts/v4/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const info: Record<string, unknown> = {};
    if (args.first_name || args.last_name) {
      info.name = { first: args.first_name, last: args.last_name };
    }
    if (args.email) info.emails = [{ tag: 'MAIN', email: args.email }];
    if (args.phone) info.phones = [{ tag: 'MAIN', phone: args.phone }];
    return this.post('/contacts/v4/contacts', { info });
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const info: Record<string, unknown> = {};
    if (args.first_name || args.last_name) {
      info.name = { first: args.first_name, last: args.last_name };
    }
    if (args.email) info.emails = [{ tag: 'MAIN', email: args.email }];
    if (args.phone) info.phones = [{ tag: 'MAIN', phone: args.phone }];
    return this.patch(`/contacts/v4/contacts/${encodeURIComponent(args.contact_id as string)}`, { info });
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.del(`/contacts/v4/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async queryProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: {
        paging: { limit: (args.limit as number) ?? 50, offset: (args.offset as number) ?? 0 },
      },
    };
    if (args.search) (body.query as Record<string, unknown>).filter = JSON.stringify({ name: { $contains: args.search } });
    return this.post('/stores/v1/products/query', body);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/stores/v1/products/${encodeURIComponent(args.product_id as string)}`);
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: {
        paging: { limit: (args.limit as number) ?? 50, offset: (args.offset as number) ?? 0 },
      },
    };
    const filters: Record<string, unknown> = {};
    if (args.status) filters.paymentStatus = args.status;
    if (args.fulfillment_status) filters.fulfillmentStatus = args.fulfillment_status;
    if (Object.keys(filters).length > 0) {
      (body.query as Record<string, unknown>).filter = JSON.stringify(filters);
    }
    return this.post('/orders/v3/orders/search', body);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.get(`/orders/v3/orders/${encodeURIComponent(args.order_id as string)}`);
  }

  private async updateOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const order: Record<string, unknown> = {};
    if (args.buyer_note) order.buyerNote = args.buyer_note;
    return this.patch(`/orders/v3/orders/${encodeURIComponent(args.order_id as string)}`, { order });
  }

  private async listBookings(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: {
        paging: { limit: (args.limit as number) ?? 50 },
      },
    };
    const filter: Record<string, unknown> = {};
    if (args.from_date) filter['startDate.$gte'] = args.from_date;
    if (args.to_date) filter['startDate.$lte'] = args.to_date;
    if (args.status) filter.status = args.status;
    if (Object.keys(filter).length > 0) {
      (body.query as Record<string, unknown>).filter = JSON.stringify(filter);
    }
    return this.post('/bookings/v2/bookings/query', body);
  }

  private async getBooking(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.booking_id) return { content: [{ type: 'text', text: 'booking_id is required' }], isError: true };
    return this.get(`/bookings/v2/bookings/${encodeURIComponent(args.booking_id as string)}`);
  }

  private async listBlogPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      paging: { limit: (args.limit as number) ?? 50, offset: (args.offset as number) ?? 0 },
    };
    if (args.status) body.status = [args.status];
    if (args.search) body.search = args.search;
    return this.post('/blog/v3/posts/query', body);
  }

  private async getBlogPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    return this.get(`/blog/v3/posts/${encodeURIComponent(args.post_id as string)}`);
  }

  private async listSitePages(args: Record<string, unknown>): Promise<ToolResult> {
    const siteId = (args.site_id as string) || this.siteId;
    const response = await this.fetchWithRetry(`${this.baseUrl}/site-structure/v1/pages`, {
      headers: siteId ? { ...this.headers, 'wix-site-id': siteId } : this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

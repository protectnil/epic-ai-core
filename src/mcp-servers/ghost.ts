/**
 * Ghost MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — Ghost Inc. has not published an official MCP server.
// Community MCP: https://github.com/MFYDev/ghost-mcp — transport: stdio, auth: Admin API key (JWT).
//   NOT published by Ghost. Community-maintained. Last commit Apr 20, 2025 (~11 months ago).
//   Exposes ~35 tools (posts, pages, members, newsletters, offers, invites, roles, tags, tiers,
//   users, webhooks — CRUD per resource). Fails criterion 1 (not vendor-official).
// Our adapter covers: 18 tools. Community MCP covers: ~35 tools.
// Recommendation: use-rest-api — no official MCP exists. Community MCP is not vendor-published.
//   Our adapter covers the stable Admin API surface for integration use (posts, pages, tags,
//   members, tiers, offers, site). Missing from our adapter vs stable API: /newsletters/,
//   /users/, /images/, /themes/, /webhooks/ — out of scope for standard integration use case.
//
// Base URL: https://{your-ghost-domain} (caller provides full domain; adapter appends /ghost/api/admin)
// Auth: JWT (HS256) signed with the Admin API key secret (hex-decoded to binary).
//       Admin API key format: {id}:{secret} — split on colon.
//       JWT header: { alg: "HS256", typ: "JWT", kid: id }
//       JWT payload: { iat: now_seconds, exp: now + 300s, aud: "/admin/" }
//       Send as: Authorization: Ghost <jwt>
// Docs: https://ghost.org/docs/admin-api/
// Rate limits: Not publicly documented. Ghost recommends polling no faster than once per second.

import { createHmac } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GhostConfig {
  adminApiKey: string;
  baseUrl: string;
}

export class GhostMCPServer extends MCPAdapterBase {
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly baseUrl: string;

  constructor(config: GhostConfig) {
    super();
    const parts = config.adminApiKey.split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('adminApiKey must be in the format "id:secret" (copy from Ghost Admin > Integrations)');
    }
    this.keyId = parts[0];
    this.keySecret = parts[1];
    // Normalize: strip trailing slash, ensure /ghost/api/admin is NOT double-appended
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'ghost',
      displayName: 'Ghost',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'ghost', 'cms', 'publishing', 'blog', 'newsletter', 'membership', 'content',
        'post', 'page', 'tag', 'author', 'member', 'tier', 'offer', 'subscription',
        'headless cms', 'digital publishing',
      ],
      toolNames: [
        'list_posts',
        'get_post',
        'create_post',
        'update_post',
        'delete_post',
        'list_pages',
        'get_page',
        'create_page',
        'update_page',
        'list_tags',
        'get_tag',
        'create_tag',
        'list_members',
        'get_member',
        'update_member',
        'list_tiers',
        'list_offers',
        'get_site',
      ],
      description: 'Ghost publishing platform: manage posts, pages, tags, members, tiers, and subscription offers via the Admin API with JWT authentication.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_posts',
        description: 'List Ghost blog posts with optional filters for status, tag, author, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by post status: published, draft, scheduled, all (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Number of posts to return (default: 15, max: 100; use "all" string for all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            filter: {
              type: 'string',
              description: 'Ghost filter expression (e.g. tag:news, author:jane, featured:true)',
            },
            order: {
              type: 'string',
              description: 'Sort order (e.g. published_at desc, title asc)',
            },
          },
        },
      },
      {
        name: 'get_post',
        description: 'Retrieve a specific Ghost post by its ID including full content, tags, and authors',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Ghost post ID (24-character hex string)',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'create_post',
        description: 'Create a new Ghost blog post with title, content (Lexical or Mobiledoc), tags, and publish status',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Post title',
            },
            html: {
              type: 'string',
              description: 'Post content as HTML (Ghost will convert to Lexical format)',
            },
            status: {
              type: 'string',
              description: 'Post status: draft, published, scheduled (default: draft)',
            },
            tags: {
              type: 'array',
              description: 'Array of tag objects with name field (e.g. [{"name": "Tech"}, {"name": "News"}])',
            },
            featured: {
              type: 'boolean',
              description: 'Whether to feature this post (default: false)',
            },
            custom_excerpt: {
              type: 'string',
              description: 'Short custom excerpt for the post (max 300 characters)',
            },
            published_at: {
              type: 'string',
              description: 'ISO 8601 datetime to publish or schedule the post (e.g. 2026-03-24T12:00:00Z)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_post',
        description: 'Update an existing Ghost post by ID — requires the current updated_at timestamp to prevent conflicts',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Ghost post ID to update',
            },
            updated_at: {
              type: 'string',
              description: 'Current updated_at value of the post (ISO 8601) — required by Ghost to prevent edit conflicts',
            },
            title: {
              type: 'string',
              description: 'New post title (optional)',
            },
            html: {
              type: 'string',
              description: 'New post content as HTML (optional)',
            },
            status: {
              type: 'string',
              description: 'New post status: draft, published, scheduled (optional)',
            },
            featured: {
              type: 'boolean',
              description: 'Whether to feature this post (optional)',
            },
          },
          required: ['post_id', 'updated_at'],
        },
      },
      {
        name: 'delete_post',
        description: 'Permanently delete a Ghost post by ID — this action cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Ghost post ID to delete',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'list_pages',
        description: 'List Ghost static pages with optional filters for status and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by page status: published, draft, all (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Number of pages to return (default: 15, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_page',
        description: 'Retrieve a specific Ghost static page by ID including full content and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Ghost page ID (24-character hex string)',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'create_page',
        description: 'Create a new Ghost static page with title, HTML content, and publish status',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Page title',
            },
            html: {
              type: 'string',
              description: 'Page content as HTML',
            },
            status: {
              type: 'string',
              description: 'Page status: draft, published (default: draft)',
            },
            custom_excerpt: {
              type: 'string',
              description: 'Short excerpt for the page (max 300 characters)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_page',
        description: 'Update an existing Ghost page by ID — requires the current updated_at timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Ghost page ID to update',
            },
            updated_at: {
              type: 'string',
              description: 'Current updated_at value of the page (ISO 8601) — prevents edit conflicts',
            },
            title: {
              type: 'string',
              description: 'New page title (optional)',
            },
            html: {
              type: 'string',
              description: 'New page content as HTML (optional)',
            },
            status: {
              type: 'string',
              description: 'New page status: draft, published (optional)',
            },
          },
          required: ['page_id', 'updated_at'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all Ghost tags with post counts and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of tags to return (default: 15, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            order: {
              type: 'string',
              description: 'Sort order (e.g. name asc, count.posts desc)',
            },
          },
        },
      },
      {
        name: 'get_tag',
        description: 'Retrieve a specific Ghost tag by ID including post count and SEO metadata',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: {
              type: 'string',
              description: 'Ghost tag ID',
            },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new Ghost tag with name, slug, and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tag name (displayed publicly)',
            },
            slug: {
              type: 'string',
              description: 'URL-safe slug for the tag (auto-generated from name if omitted)',
            },
            description: {
              type: 'string',
              description: 'Optional tag description (max 500 characters)',
            },
            accent_color: {
              type: 'string',
              description: 'Hex color for the tag in Ghost UI (e.g. #FF5733)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_members',
        description: 'List Ghost members (subscribers) with optional filters for status, tier, and newsletter subscription',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of members to return (default: 15, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            filter: {
              type: 'string',
              description: 'Ghost filter expression (e.g. status:paid, subscribed:true, tier_id:abc123)',
            },
            order: {
              type: 'string',
              description: 'Sort order (e.g. created_at desc, name asc)',
            },
          },
        },
      },
      {
        name: 'get_member',
        description: 'Retrieve a specific Ghost member by ID including subscription and tier details',
        inputSchema: {
          type: 'object',
          properties: {
            member_id: {
              type: 'string',
              description: 'Ghost member ID',
            },
          },
          required: ['member_id'],
        },
      },
      {
        name: 'update_member',
        description: 'Update a Ghost member profile including name, note, labels, and newsletter subscriptions',
        inputSchema: {
          type: 'object',
          properties: {
            member_id: {
              type: 'string',
              description: 'Ghost member ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated member display name (optional)',
            },
            note: {
              type: 'string',
              description: 'Internal admin note for this member (optional)',
            },
            subscribed: {
              type: 'boolean',
              description: 'Whether member is subscribed to the default newsletter (optional)',
            },
            labels: {
              type: 'array',
              description: 'Array of label objects to assign (e.g. [{"name": "VIP"}])',
            },
          },
          required: ['member_id'],
        },
      },
      {
        name: 'list_tiers',
        description: 'List all Ghost membership tiers (free and paid) with pricing and benefit details',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of tiers to return (default: 15)',
            },
          },
        },
      },
      {
        name: 'list_offers',
        description: 'List all Ghost subscription offers with discount type, amount, and redemption counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of offers to return (default: 15)',
            },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Retrieve Ghost site metadata including title, description, URL, logo, and version',
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
        case 'list_posts':
          return await this.listPosts(args);
        case 'get_post':
          return await this.getPost(args);
        case 'create_post':
          return await this.createPost(args);
        case 'update_post':
          return await this.updatePost(args);
        case 'delete_post':
          return await this.deletePost(args);
        case 'list_pages':
          return await this.listPages(args);
        case 'get_page':
          return await this.getPage(args);
        case 'create_page':
          return await this.createPage(args);
        case 'update_page':
          return await this.updatePage(args);
        case 'list_tags':
          return await this.listTags(args);
        case 'get_tag':
          return await this.getTag(args);
        case 'create_tag':
          return await this.createTag(args);
        case 'list_members':
          return await this.listMembers(args);
        case 'get_member':
          return await this.getMember(args);
        case 'update_member':
          return await this.updateMember(args);
        case 'list_tiers':
          return await this.listTiers(args);
        case 'list_offers':
          return await this.listOffers(args);
        case 'get_site':
          return await this.getSite();
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

  /**
   * Generate a short-lived Ghost Admin API JWT.
   * Algorithm: HS256
   * Key: binary representation of the hex-encoded Admin API secret
   * Audience: /admin/
   * Expiry: 5 minutes from now
   */
  private generateToken(): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = { alg: 'HS256', typ: 'JWT', kid: this.keyId };
    const payload = { iat: nowSeconds, exp: nowSeconds + 300, aud: '/admin/' };

    const encode = (obj: object) =>
      Buffer.from(JSON.stringify(obj))
        .toString('base64url');

    const headerB64 = encode(header);
    const payloadB64 = encode(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    // Ghost Admin API secret is hex-encoded — decode to raw binary bytes before signing
    const secretBytes = Buffer.from(this.keySecret, 'hex');
    const signature = createHmac('sha256', secretBytes)
      .update(signingInput)
      .digest('base64url');

    return `${signingInput}.${signature}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Ghost ${this.generateToken()}`,
      'Content-Type': 'application/json',
      'Accept-Version': 'v5.0',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/ghost/api/admin${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/ghost/api/admin${path}`, {
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

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/ghost/api/admin${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/ghost/api/admin${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private buildListParams(args: Record<string, unknown>, extra?: Record<string, string>): string {
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 15),
      page: String((args.page as number) || 1),
      ...extra,
    });
    if (args.filter) params.set('filter', args.filter as string);
    if (args.order) params.set('order', args.order as string);
    return params.toString();
  }

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.status) extra.status = args.status as string;
    return this.apiGet(`/posts/?${this.buildListParams(args, extra)}`);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) {
      return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    }
    return this.apiGet(`/posts/${encodeURIComponent(args.post_id as string)}/`);
  }

  private async createPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const post: Record<string, unknown> = {
      title: args.title,
      status: (args.status as string) || 'draft',
    };
    if (args.html) post.html = args.html;
    if (args.tags) post.tags = args.tags;
    if (typeof args.featured === 'boolean') post.featured = args.featured;
    if (args.custom_excerpt) post.custom_excerpt = args.custom_excerpt;
    if (args.published_at) post.published_at = args.published_at;
    return this.apiPost('/posts/', { posts: [post] });
  }

  private async updatePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id || !args.updated_at) {
      return { content: [{ type: 'text', text: 'post_id and updated_at are required' }], isError: true };
    }
    const post: Record<string, unknown> = { updated_at: args.updated_at };
    if (args.title) post.title = args.title;
    if (args.html) post.html = args.html;
    if (args.status) post.status = args.status;
    if (typeof args.featured === 'boolean') post.featured = args.featured;
    return this.apiPut(`/posts/${encodeURIComponent(args.post_id as string)}/`, { posts: [post] });
  }

  private async deletePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) {
      return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    }
    return this.apiDelete(`/posts/${encodeURIComponent(args.post_id as string)}/`);
  }

  private async listPages(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.status) extra.status = args.status as string;
    return this.apiGet(`/pages/?${this.buildListParams(args, extra)}`);
  }

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) {
      return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    }
    return this.apiGet(`/pages/${encodeURIComponent(args.page_id as string)}/`);
  }

  private async createPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const page: Record<string, unknown> = {
      title: args.title,
      status: (args.status as string) || 'draft',
    };
    if (args.html) page.html = args.html;
    if (args.custom_excerpt) page.custom_excerpt = args.custom_excerpt;
    return this.apiPost('/pages/', { pages: [page] });
  }

  private async updatePage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id || !args.updated_at) {
      return { content: [{ type: 'text', text: 'page_id and updated_at are required' }], isError: true };
    }
    const page: Record<string, unknown> = { updated_at: args.updated_at };
    if (args.title) page.title = args.title;
    if (args.html) page.html = args.html;
    if (args.status) page.status = args.status;
    return this.apiPut(`/pages/${encodeURIComponent(args.page_id as string)}/`, { pages: [page] });
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/tags/?${this.buildListParams(args)}`);
  }

  private async getTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag_id) {
      return { content: [{ type: 'text', text: 'tag_id is required' }], isError: true };
    }
    return this.apiGet(`/tags/${encodeURIComponent(args.tag_id as string)}/`);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const tag: Record<string, unknown> = { name: args.name };
    if (args.slug) tag.slug = args.slug;
    if (args.description) tag.description = args.description;
    if (args.accent_color) tag.accent_color = args.accent_color;
    return this.apiPost('/tags/', { tags: [tag] });
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/members/?${this.buildListParams(args)}`);
  }

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.member_id) {
      return { content: [{ type: 'text', text: 'member_id is required' }], isError: true };
    }
    return this.apiGet(`/members/${encodeURIComponent(args.member_id as string)}/`);
  }

  private async updateMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.member_id) {
      return { content: [{ type: 'text', text: 'member_id is required' }], isError: true };
    }
    const member: Record<string, unknown> = {};
    if (args.name) member.name = args.name;
    if (args.note) member.note = args.note;
    if (typeof args.subscribed === 'boolean') member.subscribed = args.subscribed;
    if (args.labels) member.labels = args.labels;
    return this.apiPut(`/members/${encodeURIComponent(args.member_id as string)}/`, { members: [member] });
  }

  private async listTiers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 15;
    return this.apiGet(`/tiers/?limit=${limit}&include=monthly_price,yearly_price,benefits`);
  }

  private async listOffers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 15;
    return this.apiGet(`/offers/?limit=${limit}`);
  }

  private async getSite(): Promise<ToolResult> {
    return this.apiGet('/site/');
  }
}

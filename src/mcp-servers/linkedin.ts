/**
 * LinkedIn MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official LinkedIn/Microsoft MCP server exists. Community servers found:
//   - github.com/Dishant27/linkedin-mcp-server (2 tools, unofficial, not maintained with releases)
//   - github.com/fredericbarthelet/linkedin-mcp-server (2 tools: user-info + create-post, unofficial)
// None are official LinkedIn/Microsoft projects. All community servers expose < 3 tools.
// Decision: use-rest-api. No official MCP exists; community MCP servers fail criteria 1, 3.
//
// Our adapter covers: 13 tools. Vendor MCP covers: N/A (no official MCP).
// Recommendation: This REST adapter is the authoritative LinkedIn integration.
//
// Base URL: https://api.linkedin.com/v2
// Auth: OAuth2 Bearer token (access token obtained via LinkedIn OAuth2 authorization code flow)
// Docs: https://learn.microsoft.com/en-us/linkedin/
// Rate limits: Varies by product; most endpoints throttled to 100 requests/day for non-partner apps.
// Note: Many endpoints require LinkedIn Marketing or Talent Solutions partnership program approval.
//   The Posts API (versioned) replaces the legacy /ugcPosts API; this adapter uses the legacy
//   /ugcPosts endpoint which remains functional for approved partner apps.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LinkedInConfig {
  /** OAuth2 access token obtained via LinkedIn OAuth2 flow. */
  accessToken: string;
  /** Optional base URL override (default: https://api.linkedin.com/v2). */
  baseUrl?: string;
}

export class LinkedInMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: LinkedInConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.linkedin.com/v2').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'linkedin',
      displayName: 'LinkedIn',
      version: '1.0.0',
      category: 'social' as const,
      keywords: [
        'linkedin', 'professional network', 'profile', 'connections', 'posts', 'shares',
        'company', 'organization', 'jobs', 'recruiter', 'social', 'network',
      ],
      toolNames: [
        'get_profile', 'get_connections', 'search_people',
        'get_company', 'get_company_followers', 'search_companies',
        'create_post', 'get_posts', 'delete_post',
        'list_job_postings', 'get_job_posting',
        'get_follower_statistics', 'get_post_analytics',
      ],
      description: 'Read LinkedIn profiles, connections, and company pages; create and manage posts; query follower and content analytics.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_profile',
        description: 'Get the authenticated member profile or a specific member profile by URN with optional field projection.',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'string',
              description: 'LinkedIn person URN ID (omit or leave empty to get the authenticated user\'s own profile).',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include, e.g. "id,localizedFirstName,localizedLastName,headline" (optional).',
            },
          },
        },
      },
      {
        name: 'get_connections',
        description: 'Get first-degree connections for the authenticated user with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            start: { type: 'number', description: 'Pagination start index (default: 0).' },
            count: { type: 'number', description: 'Number of results to return (default: 50, max: 500).' },
          },
        },
      },
      {
        name: 'search_people',
        description: 'Search for LinkedIn members by keywords, name, company, or title using the People Search API.',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: { type: 'string', description: 'Keywords to search for (optional).' },
            first_name: { type: 'string', description: 'First name filter (optional).' },
            last_name: { type: 'string', description: 'Last name filter (optional).' },
            company_name: { type: 'string', description: 'Company name filter (optional).' },
            title: { type: 'string', description: 'Job title filter (optional).' },
            start: { type: 'number', description: 'Pagination start index (default: 0).' },
            count: { type: 'number', description: 'Number of results (default: 10, max: 10 for non-partner).' },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Get profile information for a LinkedIn organization/company by organization ID or URN.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'LinkedIn organization URN or numeric ID (e.g. "1234567" or "urn:li:organization:1234567").',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include (optional).',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_company_followers',
        description: 'Get follower statistics and counts for a LinkedIn organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'LinkedIn organization URN or numeric ID.',
            },
            start: { type: 'number', description: 'Pagination start index (default: 0).' },
            count: { type: 'number', description: 'Number of follower records to return (default: 10).' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'search_companies',
        description: 'Search for LinkedIn organizations by keyword with optional industry and location filters.',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: { type: 'string', description: 'Keywords to search for.' },
            start: { type: 'number', description: 'Pagination start index (default: 0).' },
            count: { type: 'number', description: 'Number of results (default: 10).' },
          },
          required: ['keywords'],
        },
      },
      {
        name: 'create_post',
        description: 'Create a text post (UGC Post) on behalf of a person or organization.',
        inputSchema: {
          type: 'object',
          properties: {
            author_urn: {
              type: 'string',
              description: 'Author URN — person URN (e.g. "urn:li:person:abc123") or organization URN.',
            },
            text: {
              type: 'string',
              description: 'Post text content.',
            },
            visibility: {
              type: 'string',
              description: 'Post visibility: PUBLIC, CONNECTIONS, or LOGGED_IN (default: PUBLIC).',
            },
          },
          required: ['author_urn', 'text'],
        },
      },
      {
        name: 'get_posts',
        description: 'Get UGC posts (shares) by a specific author person or organization URN.',
        inputSchema: {
          type: 'object',
          properties: {
            author_urn: {
              type: 'string',
              description: 'Author URN (person or organization URN).',
            },
            start: { type: 'number', description: 'Pagination start index (default: 0).' },
            count: { type: 'number', description: 'Number of posts to return (default: 10, max: 100).' },
          },
          required: ['author_urn'],
        },
      },
      {
        name: 'delete_post',
        description: 'Delete a UGC post by its URN.',
        inputSchema: {
          type: 'object',
          properties: {
            post_urn: {
              type: 'string',
              description: 'The UGC post URN to delete (e.g. "urn:li:ugcPost:12345").',
            },
          },
          required: ['post_urn'],
        },
      },
      {
        name: 'list_job_postings',
        description: 'List job postings for an organization using the LinkedIn Talent Solutions Job Posting API.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Organization URN or numeric ID.',
            },
            start: { type: 'number', description: 'Pagination start index (default: 0).' },
            count: { type: 'number', description: 'Number of job postings to return (default: 10).' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_job_posting',
        description: 'Get details for a specific LinkedIn job posting by job posting URN.',
        inputSchema: {
          type: 'object',
          properties: {
            job_posting_id: {
              type: 'string',
              description: 'Job posting URN or numeric ID.',
            },
          },
          required: ['job_posting_id'],
        },
      },
      {
        name: 'get_follower_statistics',
        description: 'Get follower demographic breakdown statistics for an organization by professional facets.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Organization URN or numeric ID.',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_post_analytics',
        description: 'Get analytics (impressions, clicks, engagement) for UGC posts by an organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Organization URN or numeric ID.',
            },
            start: { type: 'number', description: 'Pagination start index (default: 0).' },
            count: { type: 'number', description: 'Number of share statistics records to return (default: 10).' },
          },
          required: ['organization_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_profile':
          return await this.getProfile(args);
        case 'get_connections':
          return await this.getConnections(args);
        case 'search_people':
          return await this.searchPeople(args);
        case 'get_company':
          return await this.getCompany(args);
        case 'get_company_followers':
          return await this.getCompanyFollowers(args);
        case 'search_companies':
          return await this.searchCompanies(args);
        case 'create_post':
          return await this.createPost(args);
        case 'get_posts':
          return await this.getPosts(args);
        case 'delete_post':
          return await this.deletePost(args);
        case 'list_job_postings':
          return await this.listJobPostings(args);
        case 'get_job_posting':
          return await this.getJobPosting(args);
        case 'get_follower_statistics':
          return await this.getFollowerStatistics(args);
        case 'get_post_analytics':
          return await this.getPostAnalytics(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  private async fetch(path: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers, ...(options?.headers as Record<string, string> ?? {}) },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content).' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fields) params.append('projection', `(${encodeURIComponent(args.fields as string)})`);
    const path = args.person_id ? `/people/(id:${encodeURIComponent(args.person_id as string)})` : '/me';
    const qs = params.toString() ? `?${params}` : '';
    return this.fetch(`${path}${qs}`);
  }

  private async getConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: 'viewer' });
    params.append('start', String((args.start as number) ?? 0));
    params.append('count', String((args.count as number) ?? 50));
    return this.fetch(`/connections?${params}`);
  }

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: 'people' });
    if (args.keywords) params.append('keywords', args.keywords as string);
    if (args.first_name) params.append('firstName', args.first_name as string);
    if (args.last_name) params.append('lastName', args.last_name as string);
    if (args.company_name) params.append('facetCompany', args.company_name as string);
    if (args.title) params.append('facetTitle', args.title as string);
    params.append('start', String((args.start as number) ?? 0));
    params.append('count', String((args.count as number) ?? 10));
    return this.fetch(`/search?${params}`);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.fields) params.append('projection', `(${encodeURIComponent(args.fields as string)})`);
    const qs = params.toString() ? `?${params}` : '';
    const orgId = String(args.organization_id).replace(/^urn:li:organization:/, '');
    return this.fetch(`/organizations/${orgId}${qs}`);
  }

  private async getCompanyFollowers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const orgId = String(args.organization_id).replace(/^urn:li:organization:/, '');
    const params = new URLSearchParams({
      q: 'organizationalEntity',
      organizationalEntity: `urn:li:organization:${orgId}`,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    });
    return this.fetch(`/organizationFollowerStatistics?${params}`);
  }

  private async searchCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.keywords) return { content: [{ type: 'text', text: 'keywords is required' }], isError: true };
    const params = new URLSearchParams({
      q: 'search',
      keywords: args.keywords as string,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    });
    return this.fetch(`/organizationSearch?${params}`);
  }

  private async createPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.author_urn || !args.text) return { content: [{ type: 'text', text: 'author_urn and text are required' }], isError: true };
    const visibility = (args.visibility as string) ?? 'PUBLIC';
    const body = {
      author: args.author_urn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: args.text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': visibility },
    };
    return this.fetch('/ugcPosts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getPosts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.author_urn) return { content: [{ type: 'text', text: 'author_urn is required' }], isError: true };
    const params = new URLSearchParams({
      q: 'authors',
      authors: `List(${encodeURIComponent(args.author_urn as string)})`,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    });
    return this.fetch(`/ugcPosts?${params}`);
  }

  private async deletePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_urn) return { content: [{ type: 'text', text: 'post_urn is required' }], isError: true };
    const encodedUrn = encodeURIComponent(args.post_urn as string);
    return this.fetch(`/ugcPosts/${encodedUrn}`, { method: 'DELETE' });
  }

  private async listJobPostings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const orgId = String(args.organization_id).replace(/^urn:li:organization:/, '');
    const params = new URLSearchParams({
      q: 'hirer',
      hirer: `urn:li:organization:${orgId}`,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    });
    return this.fetch(`/simpleJobPostings?${params}`);
  }

  private async getJobPosting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_posting_id) return { content: [{ type: 'text', text: 'job_posting_id is required' }], isError: true };
    const id = String(args.job_posting_id).replace(/^urn:li:simpleJobPosting:/, '');
    return this.fetch(`/simpleJobPostings/${id}`);
  }

  private async getFollowerStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const orgId = String(args.organization_id).replace(/^urn:li:organization:/, '');
    const params = new URLSearchParams({
      q: 'organizationalEntity',
      organizationalEntity: `urn:li:organization:${orgId}`,
    });
    return this.fetch(`/organizationFollowerStatistics?${params}`);
  }

  private async getPostAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const orgId = String(args.organization_id).replace(/^urn:li:organization:/, '');
    const params = new URLSearchParams({
      q: 'organizationalEntity',
      organizationalEntity: `urn:li:organization:${orgId}`,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    });
    return this.fetch(`/organizationalEntityShareStatistics?${params}`);
  }
}

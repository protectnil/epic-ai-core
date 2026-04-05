/**
 * BuiltWith MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/builtwith/mcp — transport: stdio + streamable-HTTP, auth: Bearer API key
// Our adapter covers: 15 tools. Vendor MCP covers: 15 tools (domain-lookup, domain-api, relationships-api, free-api,
//   company-to-url, tags-api, recommendations-api, redirects-api, keywords-api, trends-api, product-api, trust-api,
//   financial-api, social-api, vector-search). MCP is official (BuiltWith Pty Ltd), maintained (v1.1.0 released 2026-03-20).
// Recommendation: use-both — vendor MCP adds vector-search (semantic similarity search, no REST equivalent);
//   our adapter adds full parameter control. MCP fails criterion 3 threshold borderline (15 tools), but has vector-search
//   unique tool not in REST API. Combined coverage is preferred.
//
// Integration: use-both
// MCP-only tools: vector-search (semantic similarity search across technologies/categories — no REST equivalent)
// REST-only tools: domain_lookup_live (dlive1 endpoint — live real-time scan; MCP uses domain-lookup which is cached)
// Shared: domain_lookup (domain-api), domain_lookup_free (free-api), get_technology_lists (lists-api),
//   get_technology_trends (trends-api), get_domain_relationships (relationships-api), get_domain_keywords (keywords-api),
//   get_domain_redirects (redirects-api), get_company_urls (company-to-url), get_technology_recommendations (recommendations-api),
//   get_domain_trust (trust-api), get_product_info (product-api), get_domain_tags (tags-api),
//   get_domain_financial (financial-api), get_domain_social (social-api)
//
// Base URL: https://api.builtwith.com
// Auth: API key passed as KEY query parameter on every request (no header auth)
// Docs: https://api.builtwith.com/
// Rate limits: Max 8 concurrent requests, max 10 requests per second (HTTP 429 on excess)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BuiltWithConfig {
  apiKey: string;
  baseUrl?: string;
}

export class BuiltWithMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BuiltWithConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.builtwith.com';
  }

  static catalog() {
    return {
      name: 'builtwith',
      displayName: 'BuiltWith',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'builtwith', 'technology', 'tech stack', 'website', 'domain', 'lead generation',
        'competitive intelligence', 'analytics', 'cms', 'hosting', 'trends',
        'profiling', 'technology detection', 'web technologies',
      ],
      toolNames: [
        'domain_lookup', 'domain_lookup_free', 'domain_lookup_live',
        'get_technology_lists', 'get_technology_trends',
        'get_domain_relationships', 'get_domain_keywords',
        'get_domain_redirects', 'get_company_urls',
        'get_technology_recommendations', 'get_domain_trust',
        'get_product_info', 'get_domain_tags',
        'get_domain_financial', 'get_domain_social',
      ],
      description: 'BuiltWith technology profiling: look up website tech stacks, find leads by technology usage, track technology trends, analyze domain relationships and keywords.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'domain_lookup',
        description: 'Full technology profile for a domain: all detected technologies, categories, dates first/last seen, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to look up (e.g. "example.com" — no http/https prefix needed)',
            },
            hidetext: {
              type: 'boolean',
              description: 'If true, suppress the raw HTML text field in results to reduce response size (default: false)',
            },
            nometa: {
              type: 'boolean',
              description: 'If true, suppress metadata fields in results (default: false)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'domain_lookup_free',
        description: 'Free-tier technology summary for a domain: technology group/category counts and last-updated timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to look up (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'domain_lookup_live',
        description: 'Live (real-time) domain technology detection: scans the domain now including subdomains, tag managers, ads.txt, and technology versions',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to scan live (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_technology_lists',
        description: 'Get a list of websites currently using a specific technology, for lead generation and market research',
        inputSchema: {
          type: 'object',
          properties: {
            technology: {
              type: 'string',
              description: 'Technology name to search for (e.g. "Shopify", "WordPress", "Google Analytics")',
            },
            after: {
              type: 'string',
              description: 'Return sites that started using the technology after this date (YYYYMMDD format, optional)',
            },
            before: {
              type: 'string',
              description: 'Return sites that started using the technology before this date (YYYYMMDD format, optional)',
            },
          },
          required: ['technology'],
        },
      },
      {
        name: 'get_technology_trends',
        description: 'Get adoption trend data for a technology over time: usage counts by month for market analysis',
        inputSchema: {
          type: 'object',
          properties: {
            technology: {
              type: 'string',
              description: 'Technology name to get trends for (e.g. "React", "Shopify", "HubSpot")',
            },
          },
          required: ['technology'],
        },
      },
      {
        name: 'get_domain_relationships',
        description: 'Find websites related to a domain — shared IPs, same analytics IDs, common ownership signals',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to find relationships for (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_keywords',
        description: 'Extract keywords associated with a domain from its content and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to extract keywords from (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_redirects',
        description: 'Get the full redirect chain history for a domain — useful for tracking domain migrations and acquisitions',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to retrieve redirect history for (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_company_urls',
        description: 'Look up domains associated with a company name — maps company to web properties',
        inputSchema: {
          type: 'object',
          properties: {
            company: {
              type: 'string',
              description: 'Company name to look up (e.g. "Acme Corp", "Shopify Inc")',
            },
          },
          required: ['company'],
        },
      },
      {
        name: 'get_technology_recommendations',
        description: 'Get technology recommendations for a domain — other technologies commonly used with the same stack',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to get technology recommendations for (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_trust',
        description: 'Get trust and fraud signals for a domain including registration age, category flags, and risk indicators',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to check trust/fraud signals for (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_product_info',
        description: 'Search for e-commerce product information across BuiltWith-indexed sites by product identifier or keyword',
        inputSchema: {
          type: 'object',
          properties: {
            lookup: {
              type: 'string',
              description: 'Product identifier, ASIN, UPC, or keyword to search for',
            },
          },
          required: ['lookup'],
        },
      },
      {
        name: 'get_domain_tags',
        description: 'Get IP address attributes and tags for a domain — hosting provider, geography, ASN, and infrastructure details',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to get IP and infrastructure tags for (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_financial',
        description: 'Get financial and firmographic data for a domain — employee count, revenue estimate, tech spend, and SEC Edgar filings if available',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to retrieve financial data for (e.g. "example.com")',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_social',
        description: 'Get social media profiles associated with a domain — maps a social media URL to the websites that use it',
        inputSchema: {
          type: 'object',
          properties: {
            lookup: {
              type: 'string',
              description: 'Social media URL or domain to look up (e.g. "facebook.com/wayfair" or "example.com")',
            },
          },
          required: ['lookup'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'domain_lookup':
          return this.domainLookup(args);
        case 'domain_lookup_free':
          return this.domainLookupFree(args);
        case 'domain_lookup_live':
          return this.domainLookupLive(args);
        case 'get_technology_lists':
          return this.getTechnologyLists(args);
        case 'get_technology_trends':
          return this.getTechnologyTrends(args);
        case 'get_domain_relationships':
          return this.getDomainRelationships(args);
        case 'get_domain_keywords':
          return this.getDomainKeywords(args);
        case 'get_domain_redirects':
          return this.getDomainRedirects(args);
        case 'get_company_urls':
          return this.getCompanyUrls(args);
        case 'get_technology_recommendations':
          return this.getTechnologyRecommendations(args);
        case 'get_domain_trust':
          return this.getDomainTrust(args);
        case 'get_product_info':
          return this.getProductInfo(args);
        case 'get_domain_tags':
          return this.getDomainTags(args);
        case 'get_domain_financial':
          return this.getDomainFinancial(args);
        case 'get_domain_social':
          return this.getDomainSocial(args);
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

  private async bwGet(apiPath: string, params: Record<string, string>): Promise<ToolResult> {
    const queryParams = new URLSearchParams({ KEY: this.apiKey, ...params });
    const url = `${this.baseUrl}${apiPath}/api.json?${queryParams}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async domainLookup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params: Record<string, string> = { LOOKUP: args.domain as string };
    if (args.hidetext === true) params.HIDETEXT = '1';
    if (args.nometa === true) params.NOMETA = '1';
    return this.bwGet('/v21', params);
  }

  private async domainLookupFree(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/free1', { LOOKUP: args.domain as string });
  }

  private async domainLookupLive(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/dlive1', { LOOKUP: args.domain as string });
  }

  private async getTechnologyLists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.technology) return { content: [{ type: 'text', text: 'technology is required' }], isError: true };
    const params: Record<string, string> = { TECH: args.technology as string };
    if (args.after) params.AFTER = args.after as string;
    if (args.before) params.BEFORE = args.before as string;
    return this.bwGet('/lists1', params);
  }

  private async getTechnologyTrends(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.technology) return { content: [{ type: 'text', text: 'technology is required' }], isError: true };
    return this.bwGet('/trends1', { TECH: args.technology as string });
  }

  private async getDomainRelationships(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/rv1', { LOOKUP: args.domain as string });
  }

  private async getDomainKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/kw1', { LOOKUP: args.domain as string });
  }

  private async getDomainRedirects(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/redirects1', { LOOKUP: args.domain as string });
  }

  private async getCompanyUrls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company) return { content: [{ type: 'text', text: 'company is required' }], isError: true };
    return this.bwGet('/ctu1', { LOOKUP: args.company as string });
  }

  private async getTechnologyRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/rec1', { LOOKUP: args.domain as string });
  }

  private async getDomainTrust(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/trust1', { LOOKUP: args.domain as string });
  }

  private async getProductInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lookup) return { content: [{ type: 'text', text: 'lookup is required' }], isError: true };
    return this.bwGet('/product1', { LOOKUP: args.lookup as string });
  }

  private async getDomainTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/tags1', { LOOKUP: args.domain as string });
  }

  private async getDomainFinancial(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.bwGet('/fin1', { LOOKUP: args.domain as string });
  }

  private async getDomainSocial(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lookup) return { content: [{ type: 'text', text: 'lookup is required' }], isError: true };
    return this.bwGet('/social1', { LOOKUP: args.lookup as string });
  }
}

/**
 * Semrush MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.semrush.com/v1/mcp — transport: streamable-HTTP, auth: OAuth2 or API key
// Our adapter covers: 14 tools (domain, keyword, backlink, traffic analytics via REST).
// Vendor MCP covers: 3 tools only (semrush_report, semrush_report_list, semrush_report_schema) — fails 10+ tool criterion.
// Recommendation: use-rest-api — vendor MCP exposes only 3 generic report tools, well below the 10-tool threshold.
//   Our REST adapter provides 14 specific, individually-named tools with typed parameters.
//
// Base URL: https://api.semrush.com (analytics/domain/keyword); https://api.semrush.com/analytics/v1/ (backlinks)
// Auth: API key passed as query parameter: key=API_KEY
// Docs: https://developer.semrush.com/api/
// Rate limits: Depends on subscription. Requests consume API units. No hard RPS limit documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SemrushConfig {
  apiKey: string;
  baseUrl?: string;
}

export class SemrushMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SemrushConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.semrush.com';
  }

  static catalog() {
    return {
      name: 'semrush',
      displayName: 'Semrush',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'semrush', 'seo', 'keyword', 'backlink', 'domain', 'traffic', 'ranking', 'organic',
        'analytics', 'competitor', 'serp', 'digital marketing', 'search engine',
      ],
      toolNames: [
        'get_domain_overview', 'get_domain_organic_keywords', 'get_domain_paid_keywords',
        'get_keyword_overview', 'get_keyword_difficulty', 'get_related_keywords',
        'get_domain_backlinks', 'get_backlink_overview', 'get_referring_domains',
        'get_domain_traffic', 'get_competitors_organic', 'get_competitors_paid',
        'get_url_organic_keywords', 'get_phrase_questions',
      ],
      description: 'Semrush SEO and competitive intelligence: domain rankings, keyword research, backlink analysis, traffic analytics, and SERP competitor data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_domain_overview',
        description: 'Get an SEO overview for a domain including organic search traffic, paid traffic, backlinks, and authority score',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to analyze (e.g. example.com)',
            },
            database: {
              type: 'string',
              description: 'Regional database: us, uk, ca, au, de, fr, es, it, br, etc. (default: us)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_organic_keywords',
        description: 'List organic keywords a domain ranks for with their positions, search volumes, and traffic estimates',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to analyze (e.g. example.com)',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10, max: 10000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            pos_from: {
              type: 'number',
              description: 'Minimum SERP position to include (default: 1)',
            },
            pos_to: {
              type: 'number',
              description: 'Maximum SERP position to include (default: 100)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_domain_paid_keywords',
        description: 'List paid (PPC/Google Ads) keywords a domain is bidding on with estimated CPC and traffic',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to analyze',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10, max: 10000)',
            },
            offset: {
              type: 'number',
              description: 'Results offset for pagination (default: 0)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_keyword_overview',
        description: 'Get search volume, CPC, competition level, and trend data for a specific keyword',
        inputSchema: {
          type: 'object',
          properties: {
            phrase: {
              type: 'string',
              description: 'Keyword phrase to analyze (e.g. "content marketing")',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
          },
          required: ['phrase'],
        },
      },
      {
        name: 'get_keyword_difficulty',
        description: 'Get the keyword difficulty score (0-100) for one or more keywords indicating how hard it is to rank organically',
        inputSchema: {
          type: 'object',
          properties: {
            phrases: {
              type: 'string',
              description: 'Semicolon-separated keyword phrases to check difficulty for (e.g. "seo tools;content marketing")',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
          },
          required: ['phrases'],
        },
      },
      {
        name: 'get_related_keywords',
        description: 'Get related keyword suggestions for a seed keyword with search volumes and trend data',
        inputSchema: {
          type: 'object',
          properties: {
            phrase: {
              type: 'string',
              description: 'Seed keyword to find related keywords for',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10, max: 10000)',
            },
          },
          required: ['phrase'],
        },
      },
      {
        name: 'get_domain_backlinks',
        description: 'Get a list of backlinks pointing to a domain with source URL, anchor text, and authority metrics',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Target domain or URL to get backlinks for',
            },
            target_type: {
              type: 'string',
              description: 'Target type: root_domain, domain, url (default: root_domain)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10, max: 10000)',
            },
            offset: {
              type: 'number',
              description: 'Results offset for pagination (default: 0)',
            },
          },
          required: ['target'],
        },
      },
      {
        name: 'get_backlink_overview',
        description: 'Get a backlink overview for a domain including total backlinks, referring domains, and authority score',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Target domain or URL',
            },
            target_type: {
              type: 'string',
              description: 'Target type: root_domain, domain, url (default: root_domain)',
            },
          },
          required: ['target'],
        },
      },
      {
        name: 'get_referring_domains',
        description: 'Get the list of referring domains linking to a target domain with their authority scores and link counts',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Target domain to find referring domains for',
            },
            target_type: {
              type: 'string',
              description: 'Target type: root_domain, domain, url (default: root_domain)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10, max: 10000)',
            },
            offset: {
              type: 'number',
              description: 'Results offset for pagination (default: 0)',
            },
          },
          required: ['target'],
        },
      },
      {
        name: 'get_domain_traffic',
        description: 'Get estimated monthly organic traffic for a domain with trend data over time',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to get traffic estimates for',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_competitors_organic',
        description: 'Discover organic search competitors for a domain — websites ranking for similar keywords',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to find organic competitors for',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
            limit: {
              type: 'number',
              description: 'Maximum competitors to return (default: 10, max: 10000)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_competitors_paid',
        description: 'Discover paid (PPC) advertising competitors for a domain — websites bidding on the same keywords',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to find paid competitors for',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
            limit: {
              type: 'number',
              description: 'Maximum competitors to return (default: 10, max: 10000)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_url_organic_keywords',
        description: 'Get organic keywords a specific URL ranks for with positions and traffic estimates',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL to analyze (e.g. https://example.com/blog/post)',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10, max: 10000)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'get_phrase_questions',
        description: 'Get question-based keyword variations for a phrase (who, what, why, how) for content planning',
        inputSchema: {
          type: 'object',
          properties: {
            phrase: {
              type: 'string',
              description: 'Seed phrase to find question variants for (e.g. "content marketing")',
            },
            database: {
              type: 'string',
              description: 'Regional database code (default: us)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10, max: 10000)',
            },
          },
          required: ['phrase'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_domain_overview':
          return this.getDomainOverview(args);
        case 'get_domain_organic_keywords':
          return this.getDomainOrganicKeywords(args);
        case 'get_domain_paid_keywords':
          return this.getDomainPaidKeywords(args);
        case 'get_keyword_overview':
          return this.getKeywordOverview(args);
        case 'get_keyword_difficulty':
          return this.getKeywordDifficulty(args);
        case 'get_related_keywords':
          return this.getRelatedKeywords(args);
        case 'get_domain_backlinks':
          return this.getDomainBacklinks(args);
        case 'get_backlink_overview':
          return this.getBacklinkOverview(args);
        case 'get_referring_domains':
          return this.getReferringDomains(args);
        case 'get_domain_traffic':
          return this.getDomainTraffic(args);
        case 'get_competitors_organic':
          return this.getCompetitorsOrganic(args);
        case 'get_competitors_paid':
          return this.getCompetitorsPaid(args);
        case 'get_url_organic_keywords':
          return this.getUrlOrganicKeywords(args);
        case 'get_phrase_questions':
          return this.getPhraseQuestions(args);
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

  private async semrushGet(params: Record<string, string>): Promise<ToolResult> {
    const allParams = { ...params, key: this.apiKey };
    const qs = new URLSearchParams(allParams).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/?${qs}`, {});
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async semrushBacklinksGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    const allParams = { ...params, key: this.apiKey };
    const qs = new URLSearchParams(allParams).toString();
    const response = await this.fetchWithRetry(`https://api.semrush.com/analytics/v1/${path}?${qs}`, {});
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async getDomainOverview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.semrushGet({
      type: 'domain_rank',
      domain: args.domain as string,
      database: (args.database as string) || 'us',
      export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac,FKn,FPn',
    });
  }

  private async getDomainOrganicKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.semrushGet({
      type: 'domain_organic',
      domain: args.domain as string,
      database: (args.database as string) || 'us',
      display_limit: String((args.limit as number) || 10),
      display_offset: String((args.offset as number) || 0),
      display_positions_type: `${args.pos_from || 1}-${args.pos_to || 100}`,
      export_columns: 'Ph,Po,Nq,Cp,Co,Tr,Kd,Ur',
    });
  }

  private async getDomainPaidKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.semrushGet({
      type: 'domain_adwords',
      domain: args.domain as string,
      database: (args.database as string) || 'us',
      display_limit: String((args.limit as number) || 10),
      display_offset: String((args.offset as number) || 0),
      export_columns: 'Ph,Po,Nq,Cp,Tr,Ur,Tt,Ds',
    });
  }

  private async getKeywordOverview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phrase) return { content: [{ type: 'text', text: 'phrase is required' }], isError: true };
    return this.semrushGet({
      type: 'phrase_all',
      phrase: args.phrase as string,
      database: (args.database as string) || 'us',
      export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
    });
  }

  private async getKeywordDifficulty(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phrases) return { content: [{ type: 'text', text: 'phrases is required' }], isError: true };
    return this.semrushGet({
      type: 'phrase_kdi',
      phrase: args.phrases as string,
      database: (args.database as string) || 'us',
      export_columns: 'Ph,Kd',
    });
  }

  private async getRelatedKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phrase) return { content: [{ type: 'text', text: 'phrase is required' }], isError: true };
    return this.semrushGet({
      type: 'phrase_related',
      phrase: args.phrase as string,
      database: (args.database as string) || 'us',
      display_limit: String((args.limit as number) || 10),
      export_columns: 'Ph,Nq,Cp,Co,Nr,Td,Rr',
    });
  }

  private async getDomainBacklinks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target) return { content: [{ type: 'text', text: 'target is required' }], isError: true };
    return this.semrushBacklinksGet('', {
      type: 'backlinks',
      target: args.target as string,
      target_type: (args.target_type as string) || 'root_domain',
      display_limit: String((args.limit as number) || 10),
      display_offset: String((args.offset as number) || 0),
      export_columns: 'page_ascore,source_url,anchor,nofollow,response_code,first_seen,last_seen',
    });
  }

  private async getBacklinkOverview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target) return { content: [{ type: 'text', text: 'target is required' }], isError: true };
    return this.semrushBacklinksGet('', {
      type: 'backlinks_overview',
      target: args.target as string,
      target_type: (args.target_type as string) || 'root_domain',
      export_columns: 'ascore,total,domains_num,urls_num,ips_num,follows_num,nofollows_num',
    });
  }

  private async getReferringDomains(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target) return { content: [{ type: 'text', text: 'target is required' }], isError: true };
    return this.semrushBacklinksGet('', {
      type: 'backlinks_refdomains',
      target: args.target as string,
      target_type: (args.target_type as string) || 'root_domain',
      display_limit: String((args.limit as number) || 10),
      display_offset: String((args.offset as number) || 0),
      export_columns: 'domain_ascore,domain,backlinks_num,ip,country',
    });
  }

  private async getDomainTraffic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.semrushGet({
      type: 'domain_rank_history',
      domain: args.domain as string,
      database: (args.database as string) || 'us',
      export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac,Dt',
    });
  }

  private async getCompetitorsOrganic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.semrushGet({
      type: 'domain_organic_organic',
      domain: args.domain as string,
      database: (args.database as string) || 'us',
      display_limit: String((args.limit as number) || 10),
      export_columns: 'Dn,Cr,Np,Or,Ot,Oc,Ad',
    });
  }

  private async getCompetitorsPaid(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.semrushGet({
      type: 'domain_adwords_adwords',
      domain: args.domain as string,
      database: (args.database as string) || 'us',
      display_limit: String((args.limit as number) || 10),
      export_columns: 'Dn,Cr,Np,Ad,At,Ac',
    });
  }

  private async getUrlOrganicKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    return this.semrushGet({
      type: 'url_organic',
      url: args.url as string,
      database: (args.database as string) || 'us',
      display_limit: String((args.limit as number) || 10),
      export_columns: 'Ph,Po,Nq,Cp,Co,Tr,Kd',
    });
  }

  private async getPhraseQuestions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phrase) return { content: [{ type: 'text', text: 'phrase is required' }], isError: true };
    return this.semrushGet({
      type: 'phrase_questions',
      phrase: args.phrase as string,
      database: (args.database as string) || 'us',
      display_limit: String((args.limit as number) || 10),
      export_columns: 'Ph,Nq,Cp,Co,Nr',
    });
  }
}

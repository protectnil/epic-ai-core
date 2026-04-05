/**
 * Semantic Scholar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None — no official Semantic Scholar MCP server. Community servers exist
// (e.g. JackKuo666/semanticscholar-MCP-Server, benhaotang/mcp-semantic-scholar-server) but
// none are published by the Allen Institute for AI (AI2).
//
// Base URL: https://api.semanticscholar.org
// Auth: Optional API key via x-api-key header. Unauthenticated requests are rate-limited
//       to 1 RPS (shared pool). API key requests get 1 RPS dedicated; contact AI2 for more.
// Docs: https://api.semanticscholar.org/api-docs/
// Rate limits: 1 req/sec unauthenticated (shared); 1 req/sec with API key (dedicated).
//              Use exponential backoff on 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SemanticScholarConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class SemanticScholarMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: SemanticScholarConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.semanticscholar.org';
  }

  static catalog() {
    return {
      name: 'semantic-scholar',
      displayName: 'Semantic Scholar',
      version: '1.0.0',
      category: 'ai-ml',
      keywords: [
        'semantic scholar', 'academic', 'research', 'paper', 'citation', 'author', 'journal',
        'arxiv', 'publication', 'bibliography', 'reference', 'h-index', 'ai2', 'allenai',
      ],
      toolNames: [
        'search_papers', 'get_paper', 'get_paper_citations', 'get_paper_references',
        'search_authors', 'get_author', 'get_author_papers',
        'get_paper_recommendations', 'batch_get_papers', 'batch_get_authors',
      ],
      description: 'Semantic Scholar academic graph: search 200M+ papers, retrieve citations, references, author profiles, and paper recommendations from the Allen Institute for AI.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_papers',
        description: 'Search academic papers by keyword query with optional year range, field of study, and open-access filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Keyword search query (e.g. "transformer neural network attention")',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return: title, abstract, authors, year, citationCount, referenceCount, externalIds, url, openAccessPdf, fieldsOfStudy (default: title,year,authors,citationCount)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            year: {
              type: 'string',
              description: 'Filter by publication year or range: "2020" or "2018-2023"',
            },
            fields_of_study: {
              type: 'string',
              description: 'Filter by field of study: Computer Science, Medicine, Physics, Biology, etc.',
            },
            open_access_pdf: {
              type: 'boolean',
              description: 'Only return papers with an open-access PDF available (default: false)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_paper',
        description: 'Retrieve full metadata for a specific paper by Semantic Scholar paper ID, DOI, arXiv ID, or other identifier',
        inputSchema: {
          type: 'object',
          properties: {
            paper_id: {
              type: 'string',
              description: 'Paper identifier: S2 paper ID, DOI (doi:10.1234/...), arXiv ID (arXiv:1706.03762), or PMID (PMID:12345)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields: title, abstract, authors, year, citationCount, referenceCount, journal, externalIds, url, openAccessPdf, tldr, embedding (default: all main fields)',
            },
          },
          required: ['paper_id'],
        },
      },
      {
        name: 'get_paper_citations',
        description: 'Get the list of papers that cite a given paper, with optional sort and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            paper_id: {
              type: 'string',
              description: 'Paper identifier (S2 ID, DOI, arXiv ID, or PMID)',
            },
            fields: {
              type: 'string',
              description: 'Fields for each citing paper: title, year, authors, citationCount (default: title,year,authors)',
            },
            limit: {
              type: 'number',
              description: 'Maximum citations to return (default: 20, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip (default: 0)',
            },
          },
          required: ['paper_id'],
        },
      },
      {
        name: 'get_paper_references',
        description: 'Get the list of papers referenced (cited) by a given paper',
        inputSchema: {
          type: 'object',
          properties: {
            paper_id: {
              type: 'string',
              description: 'Paper identifier (S2 ID, DOI, arXiv ID, or PMID)',
            },
            fields: {
              type: 'string',
              description: 'Fields for each referenced paper: title, year, authors, citationCount (default: title,year,authors)',
            },
            limit: {
              type: 'number',
              description: 'Maximum references to return (default: 20, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip (default: 0)',
            },
          },
          required: ['paper_id'],
        },
      },
      {
        name: 'search_authors',
        description: 'Search for authors by name with optional affiliation and field-of-study filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Author name search query',
            },
            fields: {
              type: 'string',
              description: 'Fields to return: authorId, name, affiliations, paperCount, citationCount, hIndex (default: authorId,name,citationCount,hIndex)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_author',
        description: 'Get profile and metrics for a specific author by Semantic Scholar author ID',
        inputSchema: {
          type: 'object',
          properties: {
            author_id: {
              type: 'string',
              description: 'Semantic Scholar author ID (numeric string)',
            },
            fields: {
              type: 'string',
              description: 'Fields to return: authorId, name, affiliations, paperCount, citationCount, hIndex, homepage, papers (default: all)',
            },
          },
          required: ['author_id'],
        },
      },
      {
        name: 'get_author_papers',
        description: 'Get the list of papers published by a specific author, sorted by citation count or year',
        inputSchema: {
          type: 'object',
          properties: {
            author_id: {
              type: 'string',
              description: 'Semantic Scholar author ID',
            },
            fields: {
              type: 'string',
              description: 'Fields for each paper: title, year, citationCount, externalIds, journal (default: title,year,citationCount)',
            },
            limit: {
              type: 'number',
              description: 'Maximum papers to return (default: 20, max: 1000)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip (default: 0)',
            },
          },
          required: ['author_id'],
        },
      },
      {
        name: 'get_paper_recommendations',
        description: 'Get AI-generated paper recommendations based on a seed paper using Semantic Scholar\'s recommendation engine',
        inputSchema: {
          type: 'object',
          properties: {
            paper_id: {
              type: 'string',
              description: 'Seed paper identifier (S2 ID, DOI, or arXiv ID)',
            },
            fields: {
              type: 'string',
              description: 'Fields for recommended papers: title, year, authors, citationCount, externalIds (default: title,year,authors,citationCount)',
            },
            limit: {
              type: 'number',
              description: 'Maximum recommendations to return (default: 10, max: 500)',
            },
            from: {
              type: 'string',
              description: 'Source pool for recommendations: recent or all-cs-papers (default: recent)',
            },
          },
          required: ['paper_id'],
        },
      },
      {
        name: 'batch_get_papers',
        description: 'Retrieve metadata for multiple papers in a single API call by providing a list of paper IDs',
        inputSchema: {
          type: 'object',
          properties: {
            paper_ids: {
              type: 'array',
              description: 'Array of paper identifiers (S2 IDs, DOIs, arXiv IDs, or PMIDs — max 500)',
            },
            fields: {
              type: 'string',
              description: 'Fields for each paper: title, year, authors, citationCount, externalIds (default: title,year,authors,citationCount)',
            },
          },
          required: ['paper_ids'],
        },
      },
      {
        name: 'batch_get_authors',
        description: 'Retrieve metadata for multiple authors in a single API call by providing a list of author IDs',
        inputSchema: {
          type: 'object',
          properties: {
            author_ids: {
              type: 'array',
              description: 'Array of Semantic Scholar author IDs (max 1000)',
            },
            fields: {
              type: 'string',
              description: 'Fields for each author: authorId, name, affiliations, paperCount, citationCount, hIndex (default: authorId,name,citationCount,hIndex)',
            },
          },
          required: ['author_ids'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_papers':
          return this.searchPapers(args);
        case 'get_paper':
          return this.getPaper(args);
        case 'get_paper_citations':
          return this.getPaperCitations(args);
        case 'get_paper_references':
          return this.getPaperReferences(args);
        case 'search_authors':
          return this.searchAuthors(args);
        case 'get_author':
          return this.getAuthor(args);
        case 'get_author_papers':
          return this.getAuthorPapers(args);
        case 'get_paper_recommendations':
          return this.getPaperRecommendations(args);
        case 'batch_get_papers':
          return this.batchGetPapers(args);
        case 'batch_get_authors':
          return this.batchGetAuthors(args);
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
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['x-api-key'] = this.apiKey;
    return h;
  }

  private async s2Get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async s2Post(path: string, body: unknown, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
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

  private async searchPapers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      fields: (args.fields as string) || 'title,year,authors,citationCount',
      limit: String((args.limit as number) || 10),
      offset: String((args.offset as number) || 0),
    };
    if (args.year) params.year = args.year as string;
    if (args.fields_of_study) params.fieldsOfStudy = args.fields_of_study as string;
    if (args.open_access_pdf) params.openAccessPdf = 'true';
    return this.s2Get('/graph/v1/paper/search', params);
  }

  private async getPaper(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paper_id) return { content: [{ type: 'text', text: 'paper_id is required' }], isError: true };
    const fields = (args.fields as string) || 'title,abstract,authors,year,citationCount,referenceCount,journal,externalIds,url,openAccessPdf,tldr';
    return this.s2Get(`/graph/v1/paper/${encodeURIComponent(args.paper_id as string)}`, { fields });
  }

  private async getPaperCitations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paper_id) return { content: [{ type: 'text', text: 'paper_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'title,year,authors',
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    return this.s2Get(`/graph/v1/paper/${encodeURIComponent(args.paper_id as string)}/citations`, params);
  }

  private async getPaperReferences(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paper_id) return { content: [{ type: 'text', text: 'paper_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'title,year,authors',
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    return this.s2Get(`/graph/v1/paper/${encodeURIComponent(args.paper_id as string)}/references`, params);
  }

  private async searchAuthors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      fields: (args.fields as string) || 'authorId,name,citationCount,hIndex',
      limit: String((args.limit as number) || 10),
      offset: String((args.offset as number) || 0),
    };
    return this.s2Get('/graph/v1/author/search', params);
  }

  private async getAuthor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.author_id) return { content: [{ type: 'text', text: 'author_id is required' }], isError: true };
    const fields = (args.fields as string) || 'authorId,name,affiliations,paperCount,citationCount,hIndex,homepage';
    return this.s2Get(`/graph/v1/author/${encodeURIComponent(args.author_id as string)}`, { fields });
  }

  private async getAuthorPapers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.author_id) return { content: [{ type: 'text', text: 'author_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'title,year,citationCount',
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    return this.s2Get(`/graph/v1/author/${encodeURIComponent(args.author_id as string)}/papers`, params);
  }

  private async getPaperRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paper_id) return { content: [{ type: 'text', text: 'paper_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'title,year,authors,citationCount',
      limit: String((args.limit as number) || 10),
      from: (args.from as string) || 'recent',
    };
    return this.s2Get(`/recommendations/v1/papers/forpaper/${encodeURIComponent(args.paper_id as string)}`, params);
  }

  private async batchGetPapers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paper_ids || !Array.isArray(args.paper_ids)) {
      return { content: [{ type: 'text', text: 'paper_ids (array) is required' }], isError: true };
    }
    const fields = (args.fields as string) || 'title,year,authors,citationCount';
    return this.s2Post('/graph/v1/paper/batch', { ids: args.paper_ids }, { fields });
  }

  private async batchGetAuthors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.author_ids || !Array.isArray(args.author_ids)) {
      return { content: [{ type: 'text', text: 'author_ids (array) is required' }], isError: true };
    }
    const fields = (args.fields as string) || 'authorId,name,citationCount,hIndex';
    return this.s2Post('/graph/v1/author/batch', { ids: args.author_ids }, { fields });
  }
}

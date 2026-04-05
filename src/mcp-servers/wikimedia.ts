/**
 * Wikimedia MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Wikimedia Foundation MCP server exists on GitHub.
// We build a REST wrapper covering the Wikimedia REST API v1 (en.wikipedia.org).
//
// Base URL: https://en.wikipedia.org/api/rest_v1
// Auth: None required for read operations. User-Agent header recommended.
// Docs: https://en.wikipedia.org/api/rest_v1/#/
// Rate limits: ~200 req/s per IP; please set a descriptive User-Agent.
// Note: Write operations (transform, lists) require Wikipedia authentication (CSRF tokens).
//       This adapter covers the public read-only endpoints accessible without auth.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WikimediaConfig {
  /** Optional base URL override (default: https://en.wikipedia.org/api/rest_v1) */
  baseUrl?: string;
  /** User-Agent string sent with every request — set to identify your application */
  userAgent?: string;
}

export class WikimediaMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(config: WikimediaConfig = {}) {
    super();
    this.baseUrl  = config.baseUrl  ?? 'https://en.wikipedia.org/api/rest_v1';
    this.userAgent = config.userAgent ?? 'EpicAI-WikimediaAdapter/1.0 (https://protectnil.com)';
  }

  static catalog() {
    return {
      name: 'wikimedia',
      displayName: 'Wikimedia',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'wikimedia', 'wikipedia', 'wiki', 'article', 'page', 'summary', 'content',
        'media', 'html', 'wikitext', 'revision', 'math', 'formula', 'citation',
        'encyclopedia', 'knowledge', 'reference', 'open-source', 'mobile',
        'media-list', 'talk', 'lint', 'recommendation', 'translation',
      ],
      toolNames: [
        'get_page_summary',
        'get_page_html',
        'get_page_media_list',
        'get_page_mobile_html',
        'get_revision_metadata',
        'get_math_formula',
        'get_citation',
        'get_translation_recommendations',
        'get_mobile_css',
      ],
      description: 'Wikimedia REST API: fetch Wikipedia article summaries, HTML content, media lists, mobile-optimised pages, revision metadata, math formulas, citation data, and article translation recommendations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_page_summary',
        description: 'Get basic metadata and a simplified article introduction (plain-text extract, thumbnail, coordinates) for a Wikipedia title — the fastest way to get an article overview',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Wikipedia article title (e.g. "Albert_Einstein", "Mount_Everest"). Use underscores instead of spaces.',
            },
            redirect: {
              type: 'boolean',
              description: 'Follow page redirects (default: true). Set false to disable.',
            },
            acceptLanguage: {
              type: 'string',
              description: 'BCP-47 language code for the response language (e.g. "en-US", "fr"). Defaults to English.',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_page_html',
        description: 'Get the latest fully-rendered HTML for a Wikipedia article — suitable for parsing structured content, infoboxes, and tables',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Wikipedia article title (e.g. "Solar_system"). Use underscores instead of spaces.',
            },
            revision: {
              type: 'number',
              description: 'Specific revision ID to retrieve (omit for the latest revision)',
            },
            redirect: {
              type: 'boolean',
              description: 'Follow page redirects (default: true)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_page_media_list',
        description: 'Get the list of all media files (images, audio, video) used on a Wikipedia page — returns file names, captions, and section context',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Wikipedia article title (e.g. "Eiffel_Tower"). Use underscores instead of spaces.',
            },
            revision: {
              type: 'number',
              description: 'Specific revision ID to retrieve media list for (omit for latest)',
            },
            redirect: {
              type: 'boolean',
              description: 'Follow page redirects (default: true)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_page_mobile_html',
        description: 'Get mobile-optimised HTML for a Wikipedia article — stripped-down content suitable for rendering on small screens or in mobile apps',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Wikipedia article title (e.g. "Python_(programming_language)"). Use underscores instead of spaces.',
            },
            revision: {
              type: 'number',
              description: 'Specific revision ID to retrieve (omit for latest)',
            },
            redirect: {
              type: 'boolean',
              description: 'Follow page redirects (default: true)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_revision_metadata',
        description: 'Get revision metadata for a Wikipedia title — includes revision ID, timestamp, user, size delta, and tags for the latest or a specific revision',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Wikipedia article title (e.g. "Quantum_computing"). Use underscores instead of spaces.',
            },
            revision: {
              type: 'number',
              description: 'Specific revision ID (omit to get metadata for the latest revision)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_math_formula',
        description: 'Retrieve a previously-stored TeX math formula by its hash — returns the normalised formula and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            hash: {
              type: 'string',
              description: 'MD5 hash of the normalised formula (as returned by the math check endpoint)',
            },
          },
          required: ['hash'],
        },
      },
      {
        name: 'get_citation',
        description: 'Get citation data for an article identifier (DOI, PMID, ISBN, URL, etc.) in a given format — returns structured bibliographic metadata',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Output citation format: "mediawiki", "mediawiki-basefields", "zotero", "bibtex", or "wikibase"',
            },
            query: {
              type: 'string',
              description: 'Article identifier — DOI (e.g. "10.1038/nature12373"), PMID (e.g. "pmid:23907271"), ISBN, or URL',
            },
            acceptLanguage: {
              type: 'string',
              description: 'BCP-47 language code for metadata (e.g. "en-US")',
            },
          },
          required: ['format', 'query'],
        },
      },
      {
        name: 'get_translation_recommendations',
        description: 'Get recommended Wikipedia articles to translate from one language to another — useful for identifying high-value content gaps',
        inputSchema: {
          type: 'object',
          properties: {
            from_lang: {
              type: 'string',
              description: 'BCP-47 source language code (e.g. "en" for English, "de" for German)',
            },
            seed_article: {
              type: 'string',
              description: 'Optional seed article title to base recommendations on (e.g. "Machine_learning")',
            },
            count: {
              type: 'number',
              description: 'Number of article recommendations to return (default: 24, max: 500)',
            },
          },
          required: ['from_lang'],
        },
      },
      {
        name: 'get_mobile_css',
        description: 'Get the CSS stylesheet used by Wikimedia mobile apps for a given type — useful for matching the Wikipedia mobile look and feel',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'CSS type: "base", "site", or "mobile" (base = core Wikipedia styles, site = site-specific, mobile = mobile overrides)',
            },
          },
          required: ['type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_page_summary':             return this.getPageSummary(args);
        case 'get_page_html':                return this.getPageHtml(args);
        case 'get_page_media_list':          return this.getPageMediaList(args);
        case 'get_page_mobile_html':         return this.getPageMobileHtml(args);
        case 'get_revision_metadata':        return this.getRevisionMetadata(args);
        case 'get_math_formula':             return this.getMathFormula(args);
        case 'get_citation':                 return this.getCitation(args);
        case 'get_translation_recommendations': return this.getTranslationRecommendations(args);
        case 'get_mobile_css':               return this.getMobileCss(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────


  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getText(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  // ── Tool implementations ─────────────────────────────────────────────────────

  private async getPageSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args['title'] as string | undefined;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args['redirect'] === false) params['redirect'] = 'false';
    const headers: Record<string, string> = {};
    if (typeof args['acceptLanguage'] === 'string') headers['Accept-Language'] = args['acceptLanguage'];
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/page/summary/${encodeURIComponent(title)}${qs}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        ...headers,
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPageHtml(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args['title'] as string | undefined;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const revision = args['revision'] as number | undefined;
    const path = revision
      ? `/page/html/${encodeURIComponent(title)}/${revision}`
      : `/page/html/${encodeURIComponent(title)}`;
    const params: Record<string, string> = {};
    if (args['redirect'] === false) params['redirect'] = 'false';
    return this.getText(path, params);
  }

  private async getPageMediaList(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args['title'] as string | undefined;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const revision = args['revision'] as number | undefined;
    const path = revision
      ? `/page/media-list/${encodeURIComponent(title)}/${revision}`
      : `/page/media-list/${encodeURIComponent(title)}`;
    const params: Record<string, string> = {};
    if (args['redirect'] === false) params['redirect'] = 'false';
    return this.get(path, params);
  }

  private async getPageMobileHtml(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args['title'] as string | undefined;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const revision = args['revision'] as number | undefined;
    const path = revision
      ? `/page/mobile-html/${encodeURIComponent(title)}/${revision}`
      : `/page/mobile-html/${encodeURIComponent(title)}`;
    const params: Record<string, string> = {};
    if (args['redirect'] === false) params['redirect'] = 'false';
    return this.getText(path, params);
  }

  private async getRevisionMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args['title'] as string | undefined;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const revision = args['revision'] as number | undefined;
    const path = revision
      ? `/page/title/${encodeURIComponent(title)}/${revision}`
      : `/page/title/${encodeURIComponent(title)}`;
    return this.get(path);
  }

  private async getMathFormula(args: Record<string, unknown>): Promise<ToolResult> {
    const hash = args['hash'] as string | undefined;
    if (!hash) {
      return { content: [{ type: 'text', text: 'hash is required' }], isError: true };
    }
    return this.get(`/media/math/formula/${encodeURIComponent(hash)}`);
  }

  private async getCitation(args: Record<string, unknown>): Promise<ToolResult> {
    const format = args['format'] as string | undefined;
    const query  = args['query']  as string | undefined;
    if (!format || !query) {
      return { content: [{ type: 'text', text: 'format and query are required' }], isError: true };
    }
    const headers: Record<string, string> = {};
    if (typeof args['acceptLanguage'] === 'string') headers['Accept-Language'] = args['acceptLanguage'];
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/data/citation/${encodeURIComponent(format)}/${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          ...headers,
        },
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTranslationRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    const fromLang = args['from_lang'] as string | undefined;
    if (!fromLang) {
      return { content: [{ type: 'text', text: 'from_lang is required' }], isError: true };
    }
    const seedArticle = args['seed_article'] as string | undefined;
    const path = seedArticle
      ? `/data/recommendation/article/creation/translation/${encodeURIComponent(fromLang)}/${encodeURIComponent(seedArticle)}`
      : `/data/recommendation/article/creation/translation/${encodeURIComponent(fromLang)}`;
    const params: Record<string, string> = {};
    if (typeof args['count'] === 'number') params['count'] = String(args['count']);
    return this.get(path, params);
  }

  private async getMobileCss(args: Record<string, unknown>): Promise<ToolResult> {
    const type = args['type'] as string | undefined;
    if (!type) {
      return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    }
    return this.getText(`/data/css/mobile/${encodeURIComponent(type)}`);
  }
}

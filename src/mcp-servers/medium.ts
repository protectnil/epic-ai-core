/**
 * Medium MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Medium MCP server was found on GitHub or npmjs.com.
// This adapter wraps the Medium API v2 via RapidAPI (medium2.p.rapidapi.com).
//
// Base URL: https://medium2.p.rapidapi.com
// Auth: API key via x-rapidapi-key header + x-rapidapi-host header (RapidAPI gateway)
// Docs: https://docs.mediumapi.com
// Rate limits: Depends on RapidAPI plan (free tier: 150 req/month)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MediumConfig {
  /** RapidAPI key for the Medium API (x-rapidapi-key header) */
  apiKey: string;
}

export class MediumMCPServer extends MCPAdapterBase {
  private readonly baseUrl = 'https://medium2.p.rapidapi.com';
  private readonly apiKey: string;

  constructor(config: MediumConfig) {
    super();
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'medium',
      displayName: 'Medium',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'medium', 'article', 'publication', 'writer', 'post', 'blog',
        'newsletter', 'content', 'story', 'reading', 'tag', 'list', 'feed',
      ],
      toolNames: [
        'get_article', 'get_article_content', 'get_article_fans',
        'get_article_markdown', 'get_related_articles', 'get_article_responses',
        'get_latest_posts', 'get_list', 'get_list_articles', 'get_list_responses',
        'get_publication_id', 'get_publication', 'get_publication_articles',
        'get_publication_newsletter', 'get_related_tags', 'search_articles',
        'search_lists', 'search_publications', 'search_tags', 'search_users',
        'get_top_writers', 'get_topfeeds', 'get_user_id', 'get_user',
        'get_user_articles', 'get_user_followers', 'get_user_following',
        'get_user_interests', 'get_user_lists', 'get_user_publications',
        'get_user_top_articles',
      ],
      description:
        'Read Medium articles, publications, writers, lists, tags, and feeds via the Medium API (RapidAPI).',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_article',
        description:
          'Get article metadata — title, subtitle, tags, topics, publication, published date, clap count, voter count, word count, reading time, and language for a given article ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Unique hash ID assigned to the Medium article (e.g. "f06086080568")',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_content',
        description: 'Get the full text content of a Medium article by article ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Unique hash ID of the Medium article',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_fans',
        description: 'Get a list of users who clapped for (fanned) a Medium article.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Unique hash ID of the Medium article',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_markdown',
        description: 'Get the Markdown source of a Medium article by article ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Unique hash ID of the Medium article',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_related_articles',
        description: 'Get articles related to a given Medium article by article ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Unique hash ID of the Medium article',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_responses',
        description: 'Get reader responses (reply articles) for a Medium article by article ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: {
              type: 'string',
              description: 'Unique hash ID of the Medium article',
            },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_latest_posts',
        description: 'Get the latest posts for a given Medium topic slug.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_slug: {
              type: 'string',
              description: 'Topic slug as it appears in Medium URLs (e.g. "artificial-intelligence", "programming")',
            },
          },
          required: ['topic_slug'],
        },
      },
      {
        name: 'get_list',
        description: 'Get metadata for a Medium reading list by list ID.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Unique ID of the Medium list',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'get_list_articles',
        description: 'Get all articles contained in a Medium reading list.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Unique ID of the Medium list',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'get_list_responses',
        description: 'Get response articles for all articles in a Medium reading list.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Unique ID of the Medium list',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'get_publication_id',
        description: 'Look up the internal publication ID for a Medium publication by its URL slug.',
        inputSchema: {
          type: 'object',
          properties: {
            publication_slug: {
              type: 'string',
              description: 'Publication slug as it appears in the Medium URL (e.g. "towards-data-science")',
            },
          },
          required: ['publication_slug'],
        },
      },
      {
        name: 'get_publication',
        description: 'Get metadata for a Medium publication including name, description, follower count, and tags.',
        inputSchema: {
          type: 'object',
          properties: {
            publication_id: {
              type: 'string',
              description: 'Internal publication ID (obtain via get_publication_id)',
            },
          },
          required: ['publication_id'],
        },
      },
      {
        name: 'get_publication_articles',
        description: 'Get articles published in a Medium publication, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            publication_id: {
              type: 'string',
              description: 'Internal publication ID',
            },
            from: {
              type: 'string',
              description: 'Pagination cursor — timestamp of last article in previous page (optional)',
            },
          },
          required: ['publication_id'],
        },
      },
      {
        name: 'get_publication_newsletter',
        description: 'Get newsletter details for a Medium publication.',
        inputSchema: {
          type: 'object',
          properties: {
            publication_id: {
              type: 'string',
              description: 'Internal publication ID',
            },
          },
          required: ['publication_id'],
        },
      },
      {
        name: 'get_related_tags',
        description: 'Get tags related to a given Medium tag.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Tag name (e.g. "machine-learning")',
            },
          },
          required: ['tag'],
        },
      },
      {
        name: 'search_articles',
        description: 'Search Medium articles by keyword query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords for finding articles',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_lists',
        description: 'Search Medium reading lists by keyword query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords for finding lists',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_publications',
        description: 'Search Medium publications by keyword query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords for finding publications',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_tags',
        description: 'Search Medium tags by keyword query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords for finding tags',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_users',
        description: 'Search Medium users/writers by keyword query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords for finding users',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_top_writers',
        description: 'Get top writers for a given Medium topic slug.',
        inputSchema: {
          type: 'object',
          properties: {
            topic_slug: {
              type: 'string',
              description: 'Topic slug (e.g. "artificial-intelligence")',
            },
            count: {
              type: 'number',
              description: 'Number of top writers to return (default 10)',
            },
          },
          required: ['topic_slug'],
        },
      },
      {
        name: 'get_topfeeds',
        description: 'Get the top feed articles for a Medium tag and mode combination, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Tag name (e.g. "programming")',
            },
            mode: {
              type: 'string',
              description: 'Feed mode: "hot" (trending), "new" (latest), "top_year", "top_month", "top_week", or "top_all_time"',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from previous response (optional)',
            },
            count: {
              type: 'number',
              description: 'Number of articles to return (default 25)',
            },
          },
          required: ['tag', 'mode'],
        },
      },
      {
        name: 'get_user_id',
        description: 'Look up the internal Medium user ID for a given username.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Medium username (without @)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user',
        description: 'Get a Medium user profile including full name, bio, follower count, following count, and image.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID (obtain via get_user_id)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_articles',
        description: 'Get all articles written by a Medium user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_followers',
        description: 'Get a list of followers for a Medium user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID',
            },
            count: {
              type: 'number',
              description: 'Number of followers to return (default 25)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_following',
        description: 'Get a list of users that a Medium user is following.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID',
            },
            count: {
              type: 'number',
              description: 'Number of following entries to return (default 25)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_interests',
        description: 'Get the topic interests and tags followed by a Medium user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_lists',
        description: 'Get all reading lists created by a Medium user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_publications',
        description: 'Get all publications that a Medium user belongs to or owns.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_top_articles',
        description: "Get a Medium user's top-performing articles ranked by clap count.",
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Internal Medium user ID',
            },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  private buildHeaders(): Record<string, string> {
    return {
      'x-rapidapi-key': this.apiKey,
      'x-rapidapi-host': 'medium2.p.rapidapi.com',
      Accept: 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Medium API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Medium API returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_article':
          return this.getArticle(args);
        case 'get_article_content':
          return this.getArticleContent(args);
        case 'get_article_fans':
          return this.getArticleFans(args);
        case 'get_article_markdown':
          return this.getArticleMarkdown(args);
        case 'get_related_articles':
          return this.getRelatedArticles(args);
        case 'get_article_responses':
          return this.getArticleResponses(args);
        case 'get_latest_posts':
          return this.getLatestPosts(args);
        case 'get_list':
          return this.getList(args);
        case 'get_list_articles':
          return this.getListArticles(args);
        case 'get_list_responses':
          return this.getListResponses(args);
        case 'get_publication_id':
          return this.getPublicationId(args);
        case 'get_publication':
          return this.getPublication(args);
        case 'get_publication_articles':
          return this.getPublicationArticles(args);
        case 'get_publication_newsletter':
          return this.getPublicationNewsletter(args);
        case 'get_related_tags':
          return this.getRelatedTags(args);
        case 'search_articles':
          return this.searchArticles(args);
        case 'search_lists':
          return this.searchLists(args);
        case 'search_publications':
          return this.searchPublications(args);
        case 'search_tags':
          return this.searchTags(args);
        case 'search_users':
          return this.searchUsers(args);
        case 'get_top_writers':
          return this.getTopWriters(args);
        case 'get_topfeeds':
          return this.getTopfeeds(args);
        case 'get_user_id':
          return this.getUserId(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_user_articles':
          return this.getUserArticles(args);
        case 'get_user_followers':
          return this.getUserFollowers(args);
        case 'get_user_following':
          return this.getUserFollowing(args);
        case 'get_user_interests':
          return this.getUserInterests(args);
        case 'get_user_lists':
          return this.getUserLists(args);
        case 'get_user_publications':
          return this.getUserPublications(args);
        case 'get_user_top_articles':
          return this.getUserTopArticles(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const article_id = args.article_id as string;
    if (!article_id) {
      return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    }
    return this.get(`/article/${encodeURIComponent(article_id)}`);
  }

  private async getArticleContent(args: Record<string, unknown>): Promise<ToolResult> {
    const article_id = args.article_id as string;
    if (!article_id) {
      return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    }
    return this.get(`/article/${encodeURIComponent(article_id)}/content`);
  }

  private async getArticleFans(args: Record<string, unknown>): Promise<ToolResult> {
    const article_id = args.article_id as string;
    if (!article_id) {
      return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    }
    return this.get(`/article/${encodeURIComponent(article_id)}/fans`);
  }

  private async getArticleMarkdown(args: Record<string, unknown>): Promise<ToolResult> {
    const article_id = args.article_id as string;
    if (!article_id) {
      return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    }
    return this.get(`/article/${encodeURIComponent(article_id)}/markdown`);
  }

  private async getRelatedArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const article_id = args.article_id as string;
    if (!article_id) {
      return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    }
    return this.get(`/article/${encodeURIComponent(article_id)}/related`);
  }

  private async getArticleResponses(args: Record<string, unknown>): Promise<ToolResult> {
    const article_id = args.article_id as string;
    if (!article_id) {
      return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    }
    return this.get(`/article/${encodeURIComponent(article_id)}/responses`);
  }

  private async getLatestPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const topic_slug = args.topic_slug as string;
    if (!topic_slug) {
      return { content: [{ type: 'text', text: 'topic_slug is required' }], isError: true };
    }
    return this.get(`/latestposts/${encodeURIComponent(topic_slug)}`);
  }

  private async getList(args: Record<string, unknown>): Promise<ToolResult> {
    const list_id = args.list_id as string;
    if (!list_id) {
      return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    }
    return this.get(`/list/${encodeURIComponent(list_id)}`);
  }

  private async getListArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const list_id = args.list_id as string;
    if (!list_id) {
      return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    }
    return this.get(`/list/${encodeURIComponent(list_id)}/articles`);
  }

  private async getListResponses(args: Record<string, unknown>): Promise<ToolResult> {
    const list_id = args.list_id as string;
    if (!list_id) {
      return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    }
    return this.get(`/list/${encodeURIComponent(list_id)}/responses`);
  }

  private async getPublicationId(args: Record<string, unknown>): Promise<ToolResult> {
    const publication_slug = args.publication_slug as string;
    if (!publication_slug) {
      return { content: [{ type: 'text', text: 'publication_slug is required' }], isError: true };
    }
    return this.get(`/publication/id_for/${encodeURIComponent(publication_slug)}`);
  }

  private async getPublication(args: Record<string, unknown>): Promise<ToolResult> {
    const publication_id = args.publication_id as string;
    if (!publication_id) {
      return { content: [{ type: 'text', text: 'publication_id is required' }], isError: true };
    }
    return this.get(`/publication/${encodeURIComponent(publication_id)}`);
  }

  private async getPublicationArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const publication_id = args.publication_id as string;
    if (!publication_id) {
      return { content: [{ type: 'text', text: 'publication_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.from) params.set('from', args.from as string);
    const qs = params.toString();
    return this.get(`/publication/${encodeURIComponent(publication_id)}/articles${qs ? `?${qs}` : ''}`);
  }

  private async getPublicationNewsletter(args: Record<string, unknown>): Promise<ToolResult> {
    const publication_id = args.publication_id as string;
    if (!publication_id) {
      return { content: [{ type: 'text', text: 'publication_id is required' }], isError: true };
    }
    return this.get(`/publication/${encodeURIComponent(publication_id)}/newsletter`);
  }

  private async getRelatedTags(args: Record<string, unknown>): Promise<ToolResult> {
    const tag = args.tag as string;
    if (!tag) {
      return { content: [{ type: 'text', text: 'tag is required' }], isError: true };
    }
    return this.get(`/related_tags/${encodeURIComponent(tag)}`);
  }

  private async searchArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    return this.get(`/search/articles?query=${encodeURIComponent(query)}`);
  }

  private async searchLists(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    return this.get(`/search/lists?query=${encodeURIComponent(query)}`);
  }

  private async searchPublications(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    return this.get(`/search/publications?query=${encodeURIComponent(query)}`);
  }

  private async searchTags(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    return this.get(`/search/tags?query=${encodeURIComponent(query)}`);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    return this.get(`/search/users?query=${encodeURIComponent(query)}`);
  }

  private async getTopWriters(args: Record<string, unknown>): Promise<ToolResult> {
    const topic_slug = args.topic_slug as string;
    if (!topic_slug) {
      return { content: [{ type: 'text', text: 'topic_slug is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    const qs = params.toString();
    return this.get(`/top_writer/${encodeURIComponent(topic_slug)}${qs ? `?${qs}` : ''}`);
  }

  private async getTopfeeds(args: Record<string, unknown>): Promise<ToolResult> {
    const tag = args.tag as string;
    const mode = args.mode as string;
    if (!tag || !mode) {
      return { content: [{ type: 'text', text: 'tag and mode are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.after) params.set('after', args.after as string);
    if (args.count !== undefined) params.set('count', String(args.count));
    const qs = params.toString();
    return this.get(
      `/topfeeds/${encodeURIComponent(tag)}/${encodeURIComponent(mode)}${qs ? `?${qs}` : ''}`,
    );
  }

  private async getUserId(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) {
      return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    }
    return this.get(`/user/id_for/${encodeURIComponent(username)}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.get(`/user/${encodeURIComponent(user_id)}`);
  }

  private async getUserArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.get(`/user/${encodeURIComponent(user_id)}/articles`);
  }

  private async getUserFollowers(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    const qs = params.toString();
    return this.get(`/user/${encodeURIComponent(user_id)}/followers${qs ? `?${qs}` : ''}`);
  }

  private async getUserFollowing(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    const qs = params.toString();
    return this.get(`/user/${encodeURIComponent(user_id)}/following${qs ? `?${qs}` : ''}`);
  }

  private async getUserInterests(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.get(`/user/${encodeURIComponent(user_id)}/interests`);
  }

  private async getUserLists(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.get(`/user/${encodeURIComponent(user_id)}/lists`);
  }

  private async getUserPublications(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.get(`/user/${encodeURIComponent(user_id)}/publications`);
  }

  private async getUserTopArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as string;
    if (!user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.get(`/user/${encodeURIComponent(user_id)}/top_articles`);
  }
}

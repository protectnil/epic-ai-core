/**
 * Symanto Psycholinguistic Text Analytics MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Symanto vendor MCP server found.
// Our adapter covers: 7 tools (communication, emotion, ekman-emotion, language-detection,
//   personality, sentiment, topic-sentiment).
// Recommendation: Use this adapter for full Symanto psycholinguistic text analytics coverage.
//
// Base URL: https://api.symanto.net
// Auth: API key passed in header `x-api-key` on every request
// Docs: https://developers.symanto.net
// Rate limits: Not publicly documented. Contact support@symanto.net for details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SymantoConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.symanto.net) */
  baseUrl?: string;
}

export class SymantoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SymantoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.symanto.net';
  }

  static catalog() {
    return {
      name: 'symanto',
      displayName: 'Symanto Psycholinguistic Text Analytics',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'symanto', 'nlp', 'text-analysis', 'sentiment', 'emotion', 'personality',
        'psycholinguistic', 'communication', 'language-detection', 'topic',
        'ekman', 'tonality', 'writing-style', 'psychology', 'ai',
      ],
      toolNames: [
        'analyze_communication', 'analyze_emotion', 'analyze_ekman_emotion',
        'detect_language', 'analyze_personality', 'analyze_sentiment', 'analyze_topic_sentiment',
      ],
      description: 'Symanto psycholinguistic text analytics — detect emotions, personality traits, communication style, sentiment, and topics in text across 11 languages.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'analyze_communication',
        description: 'Identify the purpose and writing style of text — returns action-seeking, fact-oriented, information-seeking, or self-revealing labels. Supports ar, de, en, es, fr, it, nl, pt, ru, tr, zh.',
        inputSchema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: 'Array of text posts to analyze — each with text (required), language (required, e.g. "en"), and optional id',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional identifier for this post' },
                  text: { type: 'string', description: 'Text to analyze' },
                  language: { type: 'string', description: 'Language code (e.g. en, de, es)' },
                },
                required: ['text', 'language'],
              },
            },
            all: {
              type: 'boolean',
              description: 'Return all predictions with probabilities instead of just the top prediction (default: false)',
            },
          },
          required: ['posts'],
        },
      },
      {
        name: 'analyze_emotion',
        description: 'Detect emotions in text — returns anger, joy, love, sadness, surprise, or uncategorized. Supports en, de, es.',
        inputSchema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: 'Array of text posts to analyze — each with text (required), language (required), and optional id',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional identifier for this post' },
                  text: { type: 'string', description: 'Text to analyze' },
                  language: { type: 'string', description: 'Language code (en, de, es)' },
                },
                required: ['text', 'language'],
              },
            },
            all: {
              type: 'boolean',
              description: 'Return all emotion predictions with probabilities (default: false)',
            },
          },
          required: ['posts'],
        },
      },
      {
        name: 'analyze_ekman_emotion',
        description: 'Detect Ekman emotions in text — returns anger, disgust, fear, joy, sadness, surprise, or no-emotion. Supports en, de, es.',
        inputSchema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: 'Array of text posts to analyze — each with text (required), language (required), and optional id',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional identifier for this post' },
                  text: { type: 'string', description: 'Text to analyze' },
                  language: { type: 'string', description: 'Language code (en, de, es)' },
                },
                required: ['text', 'language'],
              },
            },
            all: {
              type: 'boolean',
              description: 'Return all Ekman emotion predictions with probabilities (default: false)',
            },
          },
          required: ['posts'],
        },
      },
      {
        name: 'detect_language',
        description: 'Identify what language a text is written in — returns the detected language code (up to 64 texts per request)',
        inputSchema: {
          type: 'object',
          properties: {
            texts: {
              type: 'array',
              description: 'Array of texts to detect language for — each with text (required) and optional id',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional identifier for this text' },
                  text: { type: 'string', description: 'Text to detect language for' },
                },
                required: ['text'],
              },
            },
          },
          required: ['texts'],
        },
      },
      {
        name: 'analyze_personality',
        description: 'Predict personality traits of text author — returns emotional or rational label. Supports ar, de, en, es, fr, it, nl, pt, ru, tr, zh.',
        inputSchema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: 'Array of text posts to analyze — each with text (required), language (required), and optional id',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional identifier for this post' },
                  text: { type: 'string', description: 'Text to analyze' },
                  language: { type: 'string', description: 'Language code (e.g. en, de, es)' },
                },
                required: ['text', 'language'],
              },
            },
            all: {
              type: 'boolean',
              description: 'Return all personality predictions with probabilities (default: false)',
            },
          },
          required: ['posts'],
        },
      },
      {
        name: 'analyze_sentiment',
        description: 'Evaluate overall tonality of text — returns positive or negative. Supports en, de, es.',
        inputSchema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: 'Array of text posts to analyze — each with text (required), language (required), and optional id',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional identifier for this post' },
                  text: { type: 'string', description: 'Text to analyze' },
                  language: { type: 'string', description: 'Language code (en, de, es)' },
                },
                required: ['text', 'language'],
              },
            },
            all: {
              type: 'boolean',
              description: 'Return all sentiment predictions with probabilities (default: false)',
            },
          },
          required: ['posts'],
        },
      },
      {
        name: 'analyze_topic_sentiment',
        description: 'Extract topics and their associated sentiments from text, relating topic mentions to positive/negative sentiment scores',
        inputSchema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              description: 'Array of text posts to analyze — each with text (required), language (required), and optional id',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Optional identifier for this post' },
                  text: { type: 'string', description: 'Text to analyze' },
                  language: { type: 'string', description: 'Language code (en, de, es)' },
                },
                required: ['text', 'language'],
              },
            },
            domain: {
              type: 'string',
              description: 'Analysis domain for improved extraction: Ecom, Employee, Hotel, or Restaurant (optional)',
              enum: ['Ecom', 'Employee', 'Hotel', 'Restaurant'],
            },
          },
          required: ['posts'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'analyze_communication':
          return this.analyzeCommunication(args);
        case 'analyze_emotion':
          return this.analyzeEmotion(args);
        case 'analyze_ekman_emotion':
          return this.analyzeEkmanEmotion(args);
        case 'detect_language':
          return this.detectLanguage(args);
        case 'analyze_personality':
          return this.analyzePersonality(args);
        case 'analyze_sentiment':
          return this.analyzeSentiment(args);
        case 'analyze_topic_sentiment':
          return this.analyzeTopicSentiment(args);
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

  private async post(path: string, body: unknown, query?: Record<string, string>): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      url += '?' + new URLSearchParams(query).toString();
    }
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Symanto returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async analyzeCommunication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.posts) return { content: [{ type: 'text', text: 'posts is required' }], isError: true };
    const query: Record<string, string> = {};
    if (args.all !== undefined) query.all = String(args.all);
    return this.post('/communication', args.posts, query);
  }

  private async analyzeEmotion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.posts) return { content: [{ type: 'text', text: 'posts is required' }], isError: true };
    const query: Record<string, string> = {};
    if (args.all !== undefined) query.all = String(args.all);
    return this.post('/emotion', args.posts, query);
  }

  private async analyzeEkmanEmotion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.posts) return { content: [{ type: 'text', text: 'posts is required' }], isError: true };
    const query: Record<string, string> = {};
    if (args.all !== undefined) query.all = String(args.all);
    return this.post('/ekman-emotion', args.posts, query);
  }

  private async detectLanguage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.texts) return { content: [{ type: 'text', text: 'texts is required' }], isError: true };
    return this.post('/language-detection', args.texts);
  }

  private async analyzePersonality(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.posts) return { content: [{ type: 'text', text: 'posts is required' }], isError: true };
    const query: Record<string, string> = {};
    if (args.all !== undefined) query.all = String(args.all);
    return this.post('/personality', args.posts, query);
  }

  private async analyzeSentiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.posts) return { content: [{ type: 'text', text: 'posts is required' }], isError: true };
    const query: Record<string, string> = {};
    if (args.all !== undefined) query.all = String(args.all);
    return this.post('/sentiment', args.posts, query);
  }

  private async analyzeTopicSentiment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.posts) return { content: [{ type: 'text', text: 'posts is required' }], isError: true };
    const query: Record<string, string> = {};
    if (args.domain) query.domain = args.domain as string;
    return this.post('/topic-sentiment', args.posts, query);
  }
}

/**
 * Datumbox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Datumbox MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 14 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: http://api.datumbox.com
// Auth: api_key in POST form body (application/x-www-form-urlencoded)
//   API key obtained from Datumbox dashboard after registration
//   Verified from: http://www.datumbox.com/api-sandbox/api-docs
// Docs: http://www.datumbox.com/machine-learning-api/
// Rate limits: Depends on plan; free tier allows limited daily calls

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DatumboxConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DatumboxMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DatumboxConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://api.datumbox.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'sentiment_analysis',
        description: 'Classify the sentiment of a text document as positive, negative, or neutral using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to analyze for sentiment. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'topic_classification',
        description: 'Classify a text document into one of several IAB topic categories (e.g., Arts, Business, Health, Sports, Technology) using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to classify into a topic category. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'adult_content_detection',
        description: 'Detect whether a text document contains adult content unsuitable for minors. Returns adult or noadult classification.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to check for adult content. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'spam_detection',
        description: 'Detect whether a text document is spam or not-spam using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to analyze for spam signals. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'readability_assessment',
        description: 'Assess the readability level of a text document (e.g., basic, intermediate, advanced) using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to assess for readability. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'language_detection',
        description: 'Detect the natural language of a text document (e.g., English, Spanish, French) using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to detect the language of. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'commercial_detection',
        description: 'Detect whether a text document is commercial or non-commercial in nature using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to classify as commercial or non-commercial. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'educational_detection',
        description: 'Detect whether a text document is educational or non-educational in nature using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to classify as educational or non-educational. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'gender_detection',
        description: 'Detect whether a text document is written by or targets a male or female audience using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to analyze for gender orientation. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'subjectivity_analysis',
        description: 'Classify a text document as subjective (opinion/personal) or objective (factual) using Datumbox machine learning.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to classify as subjective or objective. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'twitter_sentiment_analysis',
        description: 'Classify the sentiment of a tweet or short social media text as positive, negative, or neutral using a model trained on Twitter data.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The tweet or short social media text to analyze. Should not contain HTML tags.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'keyword_extraction',
        description: 'Extract keywords and word combinations (n-grams) from a text document along with their occurrence counts.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to extract keywords from. Should not contain HTML tags.',
            },
            n: {
              type: 'number',
              description: 'The number of keyword combinations (n-grams) to extract, between 1 and 5 (default: 1).',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'text_extraction',
        description: 'Extract clean text content from a document, stripping noise and returning the core textual content.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to extract clean content from.',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'document_similarity',
        description: 'Estimate the degree of similarity between two text documents. Useful for detecting duplicate content or plagiarism.',
        inputSchema: {
          type: 'object',
          properties: {
            original: {
              type: 'string',
              description: 'The first (original) text document. Should not contain HTML tags.',
            },
            copy: {
              type: 'string',
              description: 'The second text document to compare against the original. Should not contain HTML tags.',
            },
          },
          required: ['original', 'copy'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'sentiment_analysis':
          return await this.callSingleText('/1.0/SentimentAnalysis.json', args);
        case 'topic_classification':
          return await this.callSingleText('/1.0/TopicClassification.json', args);
        case 'adult_content_detection':
          return await this.callSingleText('/1.0/AdultContentDetection.json', args);
        case 'spam_detection':
          return await this.callSingleText('/1.0/SpamDetection.json', args);
        case 'readability_assessment':
          return await this.callSingleText('/1.0/ReadabilityAssessment.json', args);
        case 'language_detection':
          return await this.callSingleText('/1.0/LanguageDetection.json', args);
        case 'commercial_detection':
          return await this.callSingleText('/1.0/CommercialDetection.json', args);
        case 'educational_detection':
          return await this.callSingleText('/1.0/EducationalDetection.json', args);
        case 'gender_detection':
          return await this.callSingleText('/1.0/GenderDetection.json', args);
        case 'subjectivity_analysis':
          return await this.callSingleText('/1.0/SubjectivityAnalysis.json', args);
        case 'twitter_sentiment_analysis':
          return await this.callSingleText('/1.0/TwitterSentimentAnalysis.json', args);
        case 'keyword_extraction':
          return await this.keywordExtraction(args);
        case 'text_extraction':
          return await this.callSingleText('/1.0/TextExtraction.json', args);
        case 'document_similarity':
          return await this.documentSimilarity(args);
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

  private async request(path: string, params: Record<string, string>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const body = new URLSearchParams({ api_key: this.apiKey, ...params });

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Datumbox API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Datumbox API returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async callSingleText(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const text = args.text as string;
    if (!text) {
      return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    }
    return this.request(path, { text });
  }

  private async keywordExtraction(args: Record<string, unknown>): Promise<ToolResult> {
    const text = args.text as string;
    if (!text) {
      return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    }
    const params: Record<string, string> = { text };
    if (args.n !== undefined) params.n = String(args.n as number);
    return this.request('/1.0/KeywordExtraction.json', params);
  }

  private async documentSimilarity(args: Record<string, unknown>): Promise<ToolResult> {
    const original = args.original as string;
    const copy = args.copy as string;
    if (!original || !copy) {
      return { content: [{ type: 'text', text: 'original and copy are both required' }], isError: true };
    }
    return this.request('/1.0/DocumentSimilarity.json', { original, copy });
  }

  static catalog() {
    return {
      name: 'datumbox',
      displayName: 'Datumbox',
      version: '1.0.0',
      category: 'ai' as const,
      keywords: ['datumbox', 'nlp', 'machine-learning', 'sentiment', 'classification', 'text-analysis'],
      toolNames: [
        'sentiment_analysis',
        'topic_classification',
        'adult_content_detection',
        'spam_detection',
        'readability_assessment',
        'language_detection',
        'commercial_detection',
        'educational_detection',
        'gender_detection',
        'subjectivity_analysis',
        'twitter_sentiment_analysis',
        'keyword_extraction',
        'text_extraction',
        'document_similarity',
      ],
      description: 'Datumbox machine learning and NLP adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}

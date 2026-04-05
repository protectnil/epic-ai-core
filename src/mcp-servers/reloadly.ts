/**
 * Reloadly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server found for Reloadly.
// Reloadly's public-facing OpenAPI spec describes a basic polling/questions API
// (https://topupsapi.docs.apiary.io) — the full Reloadly Airtime/Gift Cards API
// is available at https://developers.reloadly.com with separate authentication.
// Our adapter covers: 4 tools (list questions, create question, get question, vote on choice).
// Recommendation: Use this adapter for Reloadly poll/survey operations.
//
// Base URL: https://polls.apiblueprint.org
// Auth: None specified in the public spec
// Docs: https://topupsapi.docs.apiary.io
// Rate limits: Not specified.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ReloadlyConfig {
  /** Optional base URL override (default: https://polls.apiblueprint.org) */
  baseUrl?: string;
  /** Optional Bearer token if the deployment requires authentication */
  apiToken?: string;
}

export class ReloadlyMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiToken: string | undefined;

  constructor(config: ReloadlyConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://polls.apiblueprint.org';
    this.apiToken = config.apiToken;
  }

  static catalog() {
    return {
      name: 'reloadly',
      displayName: 'Reloadly',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'reloadly', 'topup', 'airtime', 'poll', 'survey', 'question', 'vote',
        'choice', 'telecom', 'mobile', 'recharge', 'prepaid',
      ],
      toolNames: [
        'list_questions',
        'create_question',
        'get_question',
        'vote_on_choice',
      ],
      description: 'Reloadly provides telecom top-up and poll/survey capabilities — list and create poll questions, retrieve individual questions by ID, and vote on answer choices.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_questions',
        description: 'List all poll questions — returns an array of questions with their choices and vote counts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_question',
        description: 'Create a new poll question with a set of answer choices',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The poll question text (e.g. "Favourite programming language?")',
            },
            choices: {
              type: 'array',
              description: 'Array of answer choice strings (e.g. ["Swift", "Python", "Ruby"])',
              items: { type: 'string' },
            },
          },
          required: ['question', 'choices'],
        },
      },
      {
        name: 'get_question',
        description: 'Retrieve a single poll question by its ID, including choices and current vote counts',
        inputSchema: {
          type: 'object',
          properties: {
            question_id: {
              type: 'string',
              description: 'The unique identifier of the question to retrieve',
            },
          },
          required: ['question_id'],
        },
      },
      {
        name: 'vote_on_choice',
        description: 'Submit a vote for a specific choice on a poll question',
        inputSchema: {
          type: 'object',
          properties: {
            question_id: {
              type: 'string',
              description: 'The unique identifier of the question',
            },
            choice_id: {
              type: 'string',
              description: 'The unique identifier of the choice to vote for',
            },
          },
          required: ['question_id', 'choice_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_questions':
          return this.listQuestions();
        case 'create_question':
          return this.createQuestion(args);
        case 'get_question':
          return this.getQuestion(args);
        case 'vote_on_choice':
          return this.voteOnChoice(args);
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiToken) headers['Authorization'] = `Bearer ${this.apiToken}`;
    return headers;
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.buildHeaders(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Reloadly returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listQuestions(): Promise<ToolResult> {
    return this.request('/questions', 'GET');
  }

  private async createQuestion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.question) return { content: [{ type: 'text', text: 'question is required' }], isError: true };
    if (!Array.isArray(args.choices) || (args.choices as unknown[]).length === 0) {
      return { content: [{ type: 'text', text: 'choices must be a non-empty array' }], isError: true };
    }
    return this.request('/questions', 'POST', { question: args.question, choices: args.choices });
  }

  private async getQuestion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.question_id) return { content: [{ type: 'text', text: 'question_id is required' }], isError: true };
    return this.request(`/questions/${encodeURIComponent(args.question_id as string)}`, 'GET');
  }

  private async voteOnChoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.question_id) return { content: [{ type: 'text', text: 'question_id is required' }], isError: true };
    if (!args.choice_id) return { content: [{ type: 'text', text: 'choice_id is required' }], isError: true };
    return this.request(
      `/questions/${encodeURIComponent(args.question_id as string)}/choices/${encodeURIComponent(args.choice_id as string)}/votes`,
      'POST',
    );
  }
}
